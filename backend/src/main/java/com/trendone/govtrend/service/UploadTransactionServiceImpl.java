package com.trendone.govtrend.service;

import java.time.LocalDateTime;
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
import com.trendone.govtrend.dto.upload.GovernorStatInsert;
import com.trendone.govtrend.dto.upload.GovernorUploadColumn;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.GovernorUploadRow;
import com.trendone.govtrend.dto.upload.GovernorUploadSheet;
import com.trendone.govtrend.dto.upload.UploadResponse;
import com.trendone.govtrend.dto.transaction.TransactionChange;
import com.trendone.govtrend.dto.transaction.TransactionData;
import com.trendone.govtrend.exception.BizException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UploadTransactionServiceImpl implements UploadTransactionService {

    private final TransactionDao transactionDao;
    private final GovernorUploadDao governorUploadDao;
    private final FileUploadLogDao fileUploadLogDao;
    private final ObjectMapper objectMapper;

    public UploadTransactionServiceImpl(
            TransactionDao transactionDao,
            GovernorUploadDao governorUploadDao,
            FileUploadLogDao fileUploadLogDao,
            ObjectMapper objectMapper) {
        this.transactionDao = transactionDao;
        this.governorUploadDao = governorUploadDao;
        this.fileUploadLogDao = fileUploadLogDao;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public UploadResponse processUpload(
            String transactionId, GovernorUploadData uploadData, String mbrUid, String fileName) {
        List<TransactionChange> changes = new ArrayList<>();

        transactionDao.updateTransaction(transactionId, "in_progress", "{}");
        for (GovernorUploadSheet sheet : uploadData.getSheets()) {
            for (int columnIndex = 0; columnIndex < sheet.getColumns().size(); columnIndex++) {
                GovernorUploadColumn column = sheet.getColumns().get(columnIndex);
                GovernorMaster governor = governorUploadDao.findGovernor(column.getGvrnrNm(), column.getCateCd());
                boolean createdGovernor = governor == null;
                if (createdGovernor) {
                    governor = createGovernor(column, sheet.getInspctDay(), mbrUid);
                    governorUploadDao.insertGovernor(governor);
                }
                insertStatistics(governor.getGvrnrUid(), sheet.getRows(), columnIndex, mbrUid);
                changes.add(new TransactionChange(
                        governor.getGvrnrUid(),
                        createdGovernor,
                        sheet.getRows().stream()
                                .map(row -> row.getRecordDttm().toString())
                                .collect(java.util.stream.Collectors.toList())));
            }
        }

        String data = toJson(new TransactionData(1, fileName, changes));
        fileUploadLogDao.insertUploadLog(new FileUploadLog(mbrUid, "Y", fileName));
        transactionDao.updateTransaction(transactionId, "completed", data);
        return new UploadResponse(transactionId, "completed");
    }

    private void insertStatistics(
            String gvrnrUid, List<GovernorUploadRow> rows, int columnIndex, String mbrUid) {
        LocalDateTime startDttm = rows.get(0).getRecordDttm();
        LocalDateTime endDttm = rows.get(rows.size() - 1).getRecordDttm();
        governorUploadDao.deleteGovernorStats(gvrnrUid, startDttm, endDttm);
        for (GovernorUploadRow row : rows) {
            governorUploadDao.insertGovernorStat(new GovernorStatInsert(
                    gvrnrUid, row.getRecordDttm(), row.getGvrnrPress2Values().get(columnIndex), mbrUid));
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
