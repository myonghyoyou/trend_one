package com.trendone.govtrend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import com.trendone.govtrend.dao.GovernorUploadDao;
import com.trendone.govtrend.dto.upload.GovernorMaster;
import com.trendone.govtrend.dto.upload.GovernorUploadColumn;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.GovernorUploadExistingStat;
import com.trendone.govtrend.dto.upload.GovernorUploadRow;
import com.trendone.govtrend.dto.upload.GovernorUploadSheet;
import com.trendone.govtrend.dto.upload.GovernorUploadStatScope;
import com.trendone.govtrend.dto.upload.UploadImpactAnalysis;
import com.trendone.govtrend.dto.upload.UploadSheetSummary;

import org.springframework.stereotype.Service;

@Service
public class UploadImpactAnalyzer {

    private final GovernorUploadDao governorUploadDao;

    public UploadImpactAnalyzer(GovernorUploadDao governorUploadDao) {
        this.governorUploadDao = governorUploadDao;
    }

    public UploadImpactAnalysis analyze(GovernorUploadData uploadData) {
        Map<String, Scope> scopes = collectScopes(uploadData);
        List<GovernorUploadColumn> columns = scopes.values().stream()
                .map(scope -> scope.column)
                .collect(Collectors.toList());
        Map<String, GovernorMaster> governors = governorUploadDao.findGovernors(columns).stream()
                .collect(Collectors.toMap(this::keyOf, governor -> governor, (first, ignored) -> first,
                        LinkedHashMap::new));

        List<GovernorUploadStatScope> statScopes = scopes.values().stream()
                .filter(scope -> governors.containsKey(scope.key))
                .map(scope -> new GovernorUploadStatScope(
                        governors.get(scope.key).getGvrnrUid(), scope.start(), scope.end()))
                .collect(Collectors.toList());
        Map<String, Set<LocalDateTime>> existingTimestamps = new LinkedHashMap<>();
        List<GovernorUploadExistingStat> existingStats = statScopes.isEmpty()
                ? Collections.emptyList()
                : governorUploadDao.findExistingGovernorStats(statScopes);
        for (GovernorUploadExistingStat stat : existingStats) {
            existingTimestamps.computeIfAbsent(stat.getGvrnrUid(), ignored -> new TreeSet<>())
                    .add(stat.getRecordDttm());
        }

        int uploadRecordCount = 0;
        int existingAffectedRecordCount = 0;
        int replacementRecordCount = 0;
        int newRecordCount = 0;
        int deleteOnlyRecordCount = 0;
        int newGovernorCount = 0;
        int inspectionDayChangeCount = 0;
        for (Scope scope : scopes.values()) {
            GovernorMaster governor = governors.get(scope.key);
            Set<LocalDateTime> uploaded = scope.timestamps;
            uploadRecordCount += uploaded.size();
            if (governor == null) {
                newGovernorCount++;
                newRecordCount += uploaded.size();
                continue;
            }
            if (!scope.inspctDay.equals(governor.getInspctDay())) {
                inspectionDayChangeCount++;
            }
            Set<LocalDateTime> existing = existingTimestamps.getOrDefault(
                    governor.getGvrnrUid(), Collections.emptySet());
            int replacement = intersectionSize(uploaded, existing);
            int deleteOnly = existing.size() - replacement;
            replacementRecordCount += replacement;
            deleteOnlyRecordCount += deleteOnly;
            existingAffectedRecordCount += existing.size();
            newRecordCount += uploaded.size() - replacement;
        }

        List<String> warnings = new ArrayList<>();
        if (deleteOnlyRecordCount > 0) {
            warnings.add("업로드 파일에 없는 기존 측정 데이터가 삭제될 수 있습니다.");
        }
        if (inspectionDayChangeCount > 0) {
            warnings.add("기존 정압기의 점검요일이 변경될 수 있습니다.");
        }

        return new UploadImpactAnalysis(
                scopes.size(),
                newGovernorCount,
                scopes.size() - newGovernorCount,
                inspectionDayChangeCount,
                uploadRecordCount,
                existingAffectedRecordCount,
                replacementRecordCount,
                newRecordCount,
                deleteOnlyRecordCount,
                fingerprint(scopes, governors, existingTimestamps),
                summarizeSheets(uploadData),
                warnings);
    }

    private Map<String, Scope> collectScopes(GovernorUploadData uploadData) {
        Map<String, Scope> scopes = new LinkedHashMap<>();
        for (GovernorUploadSheet sheet : uploadData.getSheets()) {
            for (GovernorUploadColumn column : sheet.getColumns()) {
                String key = keyOf(column.getGvrnrNm(), column.getCateCd());
                Scope scope = scopes.computeIfAbsent(key, ignored -> new Scope(key, column, sheet.getInspctDay()));
                for (GovernorUploadRow row : sheet.getRows()) {
                    scope.timestamps.add(row.getRecordDttm());
                }
            }
        }
        return scopes;
    }

    private List<UploadSheetSummary> summarizeSheets(GovernorUploadData uploadData) {
        List<UploadSheetSummary> summaries = new ArrayList<>();
        for (GovernorUploadSheet sheet : uploadData.getSheets()) {
            int measurementCount = 0;
            for (GovernorUploadRow row : sheet.getRows()) {
                measurementCount += (int) row.getGvrnrPress2Values().stream()
                        .filter(value -> value != null)
                        .count();
            }
            summaries.add(new UploadSheetSummary(
                    sheet.getSheetName() == null ? "DATA(" + sheet.getInspctDay() + ")" : sheet.getSheetName(),
                    sheet.getInspctDay(),
                    sheet.getColumns().size(),
                    sheet.getRows().size(),
                    measurementCount));
        }
        return summaries;
    }

    private int intersectionSize(Set<LocalDateTime> left, Set<LocalDateTime> right) {
        int count = 0;
        for (LocalDateTime value : left) {
            if (right.contains(value)) {
                count++;
            }
        }
        return count;
    }

    private String fingerprint(
            Map<String, Scope> scopes,
            Map<String, GovernorMaster> governors,
            Map<String, Set<LocalDateTime>> existingTimestamps) {
        List<String> values = new ArrayList<>();
        for (Scope scope : scopes.values()) {
            GovernorMaster governor = governors.get(scope.key);
            String uid = governor == null ? "NEW" : governor.getGvrnrUid();
            String inspectionDay = governor == null ? "" : String.valueOf(governor.getInspctDay());
            Set<LocalDateTime> existing = governor == null
                    ? Collections.emptySet()
                    : existingTimestamps.getOrDefault(governor.getGvrnrUid(), Collections.emptySet());
            values.add(scope.key + "|" + uid + "|" + inspectionDay + "|" + scope.inspctDay
                    + "|" + scope.timestamps.stream().sorted().map(Object::toString).collect(Collectors.joining(","))
                    + "|" + existing.stream().sorted().map(Object::toString).collect(Collectors.joining(",")));
        }
        Collections.sort(values);
        return sha256(String.join("\n", values));
    }

    private String keyOf(GovernorMaster governor) {
        return keyOf(governor.getGvrnrNm(), governor.getCateCd());
    }

    private String keyOf(String name, String cateCd) {
        return cateCd + "\u0000" + name;
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte item : digest) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private static class Scope {

        private final String key;
        private final GovernorUploadColumn column;
        private final String inspctDay;
        private final Set<LocalDateTime> timestamps = new LinkedHashSet<>();

        private Scope(String key, GovernorUploadColumn column, String inspctDay) {
            this.key = key;
            this.column = column;
            this.inspctDay = inspctDay;
        }

        private LocalDateTime start() {
            return timestamps.stream().min(Comparator.naturalOrder()).get();
        }

        private LocalDateTime end() {
            return timestamps.stream().max(Comparator.naturalOrder()).get();
        }
    }
}
