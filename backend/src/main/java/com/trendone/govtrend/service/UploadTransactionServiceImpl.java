package com.trendone.govtrend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trendone.govtrend.dao.FileUploadLogDao;
import com.trendone.govtrend.dao.GovernorUploadDao;
import com.trendone.govtrend.dao.TransactionDao;
import com.trendone.govtrend.dto.upload.FileUploadLog;
import com.trendone.govtrend.dto.upload.GovernorMaster;
import com.trendone.govtrend.dto.upload.GovernorUploadColumn;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.GovernorUploadRow;
import com.trendone.govtrend.dto.upload.GovernorUploadSheet;
import com.trendone.govtrend.dto.upload.GovernorUploadStageRow;
import com.trendone.govtrend.dto.upload.UploadResponse;
import com.trendone.govtrend.dto.upload.UploadImpactAnalysis;
import com.trendone.govtrend.dto.transaction.TransactionChange;
import com.trendone.govtrend.dto.transaction.TransactionData;
import com.trendone.govtrend.exception.BizException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UploadTransactionServiceImpl implements UploadTransactionService {

    private final TransactionDao transactionDao;
    private final GovernorUploadDao governorUploadDao;
    private final GovernorUploadStageService governorUploadStageService;
    private final TransactionProgressService transactionProgressService;
    private final FileUploadLogDao fileUploadLogDao;
    private final ObjectMapper objectMapper;
    private final UploadImpactAnalyzer uploadImpactAnalyzer;

    public UploadTransactionServiceImpl(
            TransactionDao transactionDao,
            GovernorUploadDao governorUploadDao,
            GovernorUploadStageService governorUploadStageService,
            TransactionProgressService transactionProgressService,
            FileUploadLogDao fileUploadLogDao,
            ObjectMapper objectMapper,
            UploadImpactAnalyzer uploadImpactAnalyzer) {
        this.transactionDao = transactionDao;
        this.governorUploadDao = governorUploadDao;
        this.governorUploadStageService = governorUploadStageService;
        this.transactionProgressService = transactionProgressService;
        this.fileUploadLogDao = fileUploadLogDao;
        this.objectMapper = objectMapper;
        this.uploadImpactAnalyzer = uploadImpactAnalyzer;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UploadResponse processUpload(
            String transactionId,
            GovernorUploadData uploadData,
            String mbrUid,
            String fileName,
            String expectedFingerprint) {
        if (expectedFingerprint != null && !expectedFingerprint.trim().isEmpty()) {
            UploadImpactAnalysis currentImpact = uploadImpactAnalyzer.analyze(uploadData);
            if (!expectedFingerprint.equals(currentImpact.getDatabaseFingerprint())) {
                throw invalid("미리보기 후 데이터가 변경되었습니다. 다시 미리보기를 실행하세요.");
            }
        }
        List<TransactionChange> changes = new ArrayList<>();
        List<ResolvedUploadColumn> resolvedColumns = new ArrayList<>();
        int totalColumns = uploadData.getSheets().stream()
                .mapToInt(sheet -> sheet.getColumns().size())
                .sum();
        int resolvedColumnCount = 0;

        transactionProgressService.update(transactionId, 15, "정압기 정보를 확인하고 있습니다.");
        transactionDao.updateTransaction(transactionId, "in_progress", "{}");
        for (GovernorUploadSheet sheet : uploadData.getSheets()) {
            for (int columnIndex = 0; columnIndex < sheet.getColumns().size(); columnIndex++) {
                GovernorUploadColumn column = sheet.getColumns().get(columnIndex);
                GovernorMaster governor = governorUploadDao.findGovernor(column.getGvrnrNm(), column.getCateCd());
                boolean createdGovernor = governor == null;
                String previousInspctDay = null;
                if (createdGovernor) {
                    governor = createGovernor(column, sheet.getInspctDay(), mbrUid);
                    governorUploadDao.insertGovernor(governor);
                    previousInspctDay = "";
                } else {
                    previousInspctDay = governor.getInspctDay() == null ? "" : governor.getInspctDay();
                    if (!sheet.getInspctDay().equals(governor.getInspctDay())) {
                        governorUploadDao.updateGovernorInspectionDay(
                        governor.getGvrnrUid(), sheet.getInspctDay());
                    }
                }
                resolvedColumns.add(new ResolvedUploadColumn(sheet, columnIndex, governor));
                changes.add(new TransactionChange(
                        governor.getGvrnrUid(),
                        createdGovernor,
                        sheet.getRows().stream()
                                .map(row -> row.getRecordDttm().toString())
                                .collect(java.util.stream.Collectors.toList()),
                        previousInspctDay));
                resolvedColumnCount++;
                if (resolvedColumnCount == totalColumns || resolvedColumnCount % 20 == 0) {
                    int progress = 15 + (resolvedColumnCount * 25 / Math.max(totalColumns, 1));
                    transactionProgressService.update(transactionId, progress, "정압기 정보를 확인하고 있습니다.");
                }
            }
        }

        List<GovernorUploadStageRow> stageRows = new ArrayList<>();
        for (ResolvedUploadColumn resolvedColumn : resolvedColumns) {
            for (GovernorUploadRow row : resolvedColumn.sheet.getRows()) {
                stageRows.add(new GovernorUploadStageRow(
                        resolvedColumn.governor.getGvrnrUid(),
                        row.getRecordDttm(),
                        row.getGvrnrPress2Values().get(resolvedColumn.columnIndex)));
            }
        }

        transactionProgressService.update(transactionId, 45, "측정 데이터를 임시 저장하고 있습니다.");
        governorUploadStageService.deleteStage(transactionId);
        governorUploadStageService.copyRows(transactionId, stageRows);
        transactionProgressService.update(transactionId, 65, "기존 측정 데이터를 정리하고 있습니다.");
        governorUploadStageService.deleteExistingGovernorStats(transactionId);
        transactionProgressService.update(transactionId, 80, "측정 데이터를 저장하고 있습니다.");
        governorUploadStageService.insertGovernorStats(transactionId, mbrUid);
        governorUploadStageService.deleteStage(transactionId);
        transactionProgressService.update(transactionId, 95, "업로드 결과를 정리하고 있습니다.");

        String data = toJson(new TransactionData(1, fileName, changes));
        fileUploadLogDao.insertUploadLog(new FileUploadLog(mbrUid, "Y", fileName));
        transactionDao.updateTransaction(transactionId, "completed", data);
        return new UploadResponse(transactionId, "completed");
    }

    private BizException invalid(String message) {
        return new BizException(com.trendone.govtrend.common.ErrorCode.INPUT_VALUE_INVALID, message);
    }

    private static class ResolvedUploadColumn {

        private final GovernorUploadSheet sheet;
        private final int columnIndex;
        private final GovernorMaster governor;

        private ResolvedUploadColumn(
                GovernorUploadSheet sheet, int columnIndex, GovernorMaster governor) {
            this.sheet = sheet;
            this.columnIndex = columnIndex;
            this.governor = governor;
        }
    }

    private GovernorMaster createGovernor(GovernorUploadColumn column, String inspctDay, String mbrUid) {
        GovernorMaster governor = new GovernorMaster();
        governor.setGvrnrUid("gvrnr_" + UUID.randomUUID().toString().replace("-", ""));
        governor.setGvrnrNm(column.getGvrnrNm());
        governor.setCateCd(column.getCateCd());
        governor.setInspctDay(inspctDay);
        governor.setRgstUid(mbrUid);
        governor.setUpdtUid(mbrUid);
        return governor;
    }

    private String toJson(TransactionData data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException exception) {
            throw new BizException(com.trendone.govtrend.common.ErrorCode.MSG_PROC_FAIL,
                    "트랜잭션 정보를 저장할 수 없습니다.");
        }
    }
}
