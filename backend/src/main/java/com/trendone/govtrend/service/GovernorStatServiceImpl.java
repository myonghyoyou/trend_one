package com.trendone.govtrend.service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.dao.GovernorStatDao;
import com.trendone.govtrend.dto.governor.GovernorStatItem;
import com.trendone.govtrend.dto.governor.GovernorStatRow;
import com.trendone.govtrend.dto.governor.GovernorStatsRequest;
import com.trendone.govtrend.dto.governor.GovernorStatsResponse;
import com.trendone.govtrend.exception.BizException;

import org.springframework.stereotype.Service;

@Service
public class GovernorStatServiceImpl implements GovernorStatService {

    private static final Set<Integer> INTERVAL_OPTIONS = new HashSet<>(Arrays.asList(1, 20, 30, 40));
    private static final String GOVERNOR_UID_PATTERN = "^[A-Za-z0-9_-]+$";

    private final GovernorStatDao governorStatDao;

    public GovernorStatServiceImpl(GovernorStatDao governorStatDao) {
        this.governorStatDao = governorStatDao;
    }

    @Override
    public GovernorStatsResponse search(GovernorStatsRequest request) {
        LocalDate[] dates = validateDates(request);
        int interval = parseInterval(request);
        List<String> uidList = parseUids(request.getGvrnrUids());
        List<String> nameList = parseNames(request.getGvrnrNms());

        request.setStartDate(dates[0].toString());
        request.setEndDate(dates[1].toString());
        request.setIntervalNum(String.valueOf(interval));
        request.setGovernorUidList(uidList);

        Map<String, GovernorStatItem> statDataObj = initializeItems(uidList, nameList);
        Map<String, Map<String, GovernorStatRow>> rowsByUid = initializeRows(uidList);
        List<String> xAxisList = new ArrayList<>();
        Set<String> xAxisSet = new LinkedHashSet<>();

        for (GovernorStatRow row : governorStatDao.findGovernorStats(request)) {
            if (!rowsByUid.containsKey(row.getGvrnrUid()) || row.getRecordDttm() == null) {
                continue;
            }
            String timestamp = toMinute(row.getRecordDttm());
            rowsByUid.get(row.getGvrnrUid()).put(timestamp, row);
            if (xAxisSet.add(timestamp)) {
                xAxisList.add(timestamp);
            }
        }

        populateItems(statDataObj, rowsByUid, xAxisList);
        return new GovernorStatsResponse(xAxisList, statDataObj);
    }

    private LocalDate[] validateDates(GovernorStatsRequest request) {
        if (request == null || isBlank(request.getStartDate()) || isBlank(request.getEndDate())) {
            throw invalid("시작일과 종료일을 입력하세요.");
        }
        try {
            LocalDate startDate = LocalDate.parse(request.getStartDate());
            LocalDate endDate = LocalDate.parse(request.getEndDate());
            if (endDate.isBefore(startDate)) {
                throw invalid("종료일은 시작일 이후여야 합니다.");
            }
            if (ChronoUnit.DAYS.between(startDate, endDate) > 30) {
                throw invalid("날짜 범위는 최대 30일입니다.");
            }
            return new LocalDate[] { startDate, endDate };
        } catch (DateTimeParseException exception) {
            throw invalid("날짜 형식이 올바르지 않습니다.");
        }
    }

    private int parseInterval(GovernorStatsRequest request) {
        if (isBlank(request.getIntervalNum())) {
            return 1;
        }
        try {
            int interval = Integer.parseInt(request.getIntervalNum());
            if (!INTERVAL_OPTIONS.contains(interval)) {
                throw invalid("조회 간격 값이 올바르지 않습니다.");
            }
            return interval;
        } catch (NumberFormatException exception) {
            throw invalid("조회 간격 값이 올바르지 않습니다.");
        }
    }

    private List<String> parseUids(String value) {
        if (isBlank(value)) {
            throw invalid("통계를 조회할 정압기를 선택하세요.");
        }
        List<String> uidList = Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(uid -> !uid.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        if (uidList.isEmpty() || uidList.size() > 3
                || uidList.stream().anyMatch(uid -> uid.length() > 40 || !uid.matches(GOVERNOR_UID_PATTERN))) {
            throw invalid("정압기 선택 값이 올바르지 않습니다.");
        }
        return uidList;
    }

    private List<String> parseNames(String value) {
        if (isBlank(value)) {
            return new ArrayList<>();
        }
        return Arrays.stream(value.split(",", -1)).map(String::trim).collect(Collectors.toList());
    }

    private Map<String, GovernorStatItem> initializeItems(List<String> uidList, List<String> nameList) {
        Map<String, GovernorStatItem> items = new LinkedHashMap<>();
        for (int index = 0; index < uidList.size(); index++) {
            GovernorStatItem item = new GovernorStatItem();
            item.setGvrnrNm(index < nameList.size() && !isBlank(nameList.get(index))
                    ? nameList.get(index) : uidList.get(index));
            item.setGvrnrPress2(new ArrayList<>());
            item.setGvrnrPress2Chart(new ArrayList<>());
            item.setGvrnrTrnsps2(new ArrayList<>());
            item.setRecordDttm(new ArrayList<>());
            items.put(uidList.get(index), item);
        }
        return items;
    }

    private Map<String, Map<String, GovernorStatRow>> initializeRows(List<String> uidList) {
        Map<String, Map<String, GovernorStatRow>> rowsByUid = new LinkedHashMap<>();
        for (String uid : uidList) {
            rowsByUid.put(uid, new LinkedHashMap<>());
        }
        return rowsByUid;
    }

    private void populateItems(Map<String, GovernorStatItem> items,
            Map<String, Map<String, GovernorStatRow>> rowsByUid, List<String> xAxisList) {
        for (Map.Entry<String, GovernorStatItem> entry : items.entrySet()) {
            GovernorStatItem item = entry.getValue();
            for (String timestamp : xAxisList) {
                GovernorStatRow row = rowsByUid.get(entry.getKey()).get(timestamp);
                item.getGvrnrPress2().add(row == null ? null : row.getGvrnrPress2());
                item.getGvrnrPress2Chart().add(Arrays.<Object>asList(timestamp,
                        row == null ? null : row.getGvrnrPress2()));
                item.getGvrnrTrnsps2().add(row == null ? null : row.getGvrnrTrnsps2());
                item.getRecordDttm().add(row == null ? null : row.getRecordDttm());
            }
        }
    }

    private String toMinute(String recordDttm) {
        return recordDttm.length() >= 16 ? recordDttm.substring(0, 16) : recordDttm;
    }

    private BizException invalid(String message) {
        return new BizException(ErrorCode.INPUT_VALUE_INVALID, message);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
