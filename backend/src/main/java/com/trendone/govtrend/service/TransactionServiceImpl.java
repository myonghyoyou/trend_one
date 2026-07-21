package com.trendone.govtrend.service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trendone.govtrend.dao.TransactionDao;
import com.trendone.govtrend.dao.GovernorUploadDao;
import com.trendone.govtrend.dto.transaction.RollbackResponse;
import com.trendone.govtrend.dto.transaction.RollbackRequest;
import com.trendone.govtrend.dto.transaction.TransactionChange;
import com.trendone.govtrend.dto.transaction.TransactionData;
import com.trendone.govtrend.dto.transaction.TransactionCreateResponse;
import com.trendone.govtrend.dto.transaction.TransactionListResponse;
import com.trendone.govtrend.dto.transaction.TransactionRecord;
import com.trendone.govtrend.dto.transaction.TransactionStatusResponse;
import com.trendone.govtrend.exception.BizException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionServiceImpl implements TransactionService {

    private static final int ROLLBACK_RECORD_BATCH_SIZE = 5000;

    private final TransactionDao transactionDao;
    private final GovernorUploadDao governorUploadDao;
    private final ObjectMapper objectMapper;

    public TransactionServiceImpl(
            TransactionDao transactionDao,
            GovernorUploadDao governorUploadDao,
            ObjectMapper objectMapper) {
        this.transactionDao = transactionDao;
        this.governorUploadDao = governorUploadDao;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public TransactionCreateResponse createPending() {
        String transactionId = UUID.randomUUID().toString();
        TransactionRecord transaction = new TransactionRecord();
        transaction.setTransactionId(transactionId);
        transaction.setStatus("pending");
        transaction.setData("{}");
        transactionDao.insertTransaction(transaction);
        return new TransactionCreateResponse(transactionId, "pending");
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(String transactionId, String reason) {
        String data;
        try {
            data = objectMapper.writeValueAsString(
                    Collections.singletonMap("error", reason == null ? "처리 실패" : reason));
        } catch (Exception exception) {
            data = "{}";
        }
        transactionDao.updateTransaction(transactionId, "failed", data);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markInProgress(String transactionId) {
        transactionDao.updateTransaction(transactionId, "in_progress", "{}");
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionListResponse findActiveTransactions() {
        return new TransactionListResponse(transactionDao.findActiveTransactions());
    }

    @Override
    @Transactional(readOnly = true)
    public TransactionStatusResponse findTransactionStatus(String transactionId) {
        if (isBlank(transactionId)) {
            throw invalid("트랜잭션 ID를 입력하세요.");
        }
        try {
            UUID.fromString(transactionId);
        } catch (IllegalArgumentException exception) {
            throw invalid("트랜잭션 ID 형식이 올바르지 않습니다.");
        }

        TransactionStatusResponse status = transactionDao.findTransactionStatus(transactionId);
        if (status == null) {
            throw invalid("트랜잭션을 찾을 수 없습니다.");
        }
        return status;
    }

    @Override
    @Transactional
    public RollbackResponse rollbackTransaction(RollbackRequest request) {
        String transactionId = request == null ? null : request.getTransactionId();
        if (isBlank(transactionId)) {
            throw invalid("rollback할 트랜잭션 ID를 입력하세요.");
        }
        try {
            UUID.fromString(transactionId);
        } catch (IllegalArgumentException exception) {
            throw invalid("트랜잭션 ID 형식이 올바르지 않습니다.");
        }

        TransactionRecord transaction = transactionDao.findTransactionForUpdate(transactionId);
        if (transaction == null) {
            throw invalid("트랜잭션을 찾을 수 없습니다.");
        }
        if ("rolled_back".equals(transaction.getStatus())) {
            return new RollbackResponse("이미 rollback된 트랜잭션입니다.");
        }
        if (!"completed".equals(transaction.getStatus())) {
            throw invalid("완료된 업로드만 rollback할 수 있습니다.");
        }

        TransactionData transactionData = parseTransactionData(transaction.getData());
        List<TransactionChange> changes = transactionData.getItems();
        if (changes == null || changes.isEmpty()) {
            throw invalid("rollback할 업로드 데이터가 없습니다.");
        }

        for (TransactionChange change : changes) {
            if (isBlank(change.getGvrnrUid()) || change.getRecordDttms() == null
                    || change.getRecordDttms().isEmpty()
                    || change.getRecordDttms().stream().anyMatch(this::isBlank)) {
                throw invalid("rollback 데이터가 올바르지 않습니다.");
            }
            if (governorUploadDao.findGovernorForUpdate(change.getGvrnrUid()) == null) {
                throw invalid("rollback 대상 정압기를 찾을 수 없습니다.");
            }
        }

        for (TransactionChange change : changes) {
            if (transactionDao.existsNewerCompletedTransaction(
                    transactionId, change.getGvrnrUid())) {
                throw invalid("이후 업로드가 존재하여 rollback할 수 없습니다.");
            }
        }

        deleteGovernorStatsInBatches(changes);
        for (TransactionChange change : changes) {
            if (change.isCreatedGovernor()) {
                governorUploadDao.deleteGovernorIfNoStats(change.getGvrnrUid());
            } else if (change.getPreviousInspctDay() != null) {
                governorUploadDao.updateGovernorInspectionDay(
                        change.getGvrnrUid(),
                        change.getPreviousInspctDay().isEmpty() ? null : change.getPreviousInspctDay());
            }
        }
        transactionDao.markRolledBack(Collections.singletonList(transactionId));
        return new RollbackResponse("트랜잭션 rollback이 완료되었습니다.");
    }

    private void deleteGovernorStatsInBatches(List<TransactionChange> changes) {
        for (TransactionChange change : changes) {
            List<String> recordDttms = change.getRecordDttms();
            for (int start = 0; start < recordDttms.size(); start += ROLLBACK_RECORD_BATCH_SIZE) {
                int end = Math.min(start + ROLLBACK_RECORD_BATCH_SIZE, recordDttms.size());
                TransactionChange batch = new TransactionChange(
                        change.getGvrnrUid(),
                        change.isCreatedGovernor(),
                        recordDttms.subList(start, end),
                        change.getPreviousInspctDay());
                transactionDao.deleteGovernorStatsByChanges(Collections.singletonList(batch));
            }
        }
    }

    private TransactionData parseTransactionData(String data) {
        try {
            TransactionData transactionData = objectMapper.readValue(
                    data == null ? "{}" : data, TransactionData.class);
            if (transactionData.getVersion() != 1) {
                throw invalid("지원하지 않는 rollback 데이터 버전입니다.");
            }
            return transactionData;
        } catch (Exception exception) {
            if (exception instanceof BizException) {
                throw (BizException) exception;
            }
            throw invalid("트랜잭션 데이터를 해석할 수 없습니다.");
        }
    }

    private BizException invalid(String message) {
        return new BizException(com.trendone.govtrend.common.ErrorCode.INPUT_VALUE_INVALID, message);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

}
