package com.trendone.govtrend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Arrays;
import java.util.Collections;
import java.util.UUID;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trendone.govtrend.dao.GovernorUploadDao;
import com.trendone.govtrend.dao.TransactionDao;
import com.trendone.govtrend.dto.transaction.RollbackRequest;
import com.trendone.govtrend.dto.transaction.RollbackResponse;
import com.trendone.govtrend.dto.transaction.TransactionChange;
import com.trendone.govtrend.dto.transaction.TransactionData;
import com.trendone.govtrend.dto.transaction.TransactionRecord;
import com.trendone.govtrend.dto.upload.GovernorMaster;
import com.trendone.govtrend.exception.BizException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TransactionServiceImplTest {

    @Mock
    private TransactionDao transactionDao;

    @Mock
    private GovernorUploadDao governorUploadDao;

    private TransactionServiceImpl transactionService;

    @BeforeEach
    void setUp() {
        transactionService = new TransactionServiceImpl(
                transactionDao, governorUploadDao, new ObjectMapper());
    }

    @Test
    void rollsBackOnlyTheRequestedCompletedTransaction() throws Exception {
        String transactionId = UUID.randomUUID().toString();
        TransactionRecord transaction = transaction("completed", transactionData(
                new TransactionChange("new-governor", true,
                        Arrays.asList("2022-07-04T00:00", "2022-07-04T00:10")),
                new TransactionChange("existing-governor", false,
                        Collections.singletonList("2022-07-04T00:00"))));
        when(transactionDao.findTransactionForUpdate(transactionId)).thenReturn(transaction);
        when(transactionDao.existsNewerCompletedTransaction(eq(transactionId), eq("new-governor")))
                .thenReturn(false);
        when(transactionDao.existsNewerCompletedTransaction(eq(transactionId), eq("existing-governor")))
                .thenReturn(false);
        when(governorUploadDao.findGovernorForUpdate("new-governor"))
                .thenReturn(new GovernorMaster());
        when(governorUploadDao.findGovernorForUpdate("existing-governor"))
                .thenReturn(new GovernorMaster());

        RollbackResponse response = transactionService.rollbackTransaction(request(transactionId));

        assertEquals("트랜잭션 rollback이 완료되었습니다.", response.getMessage());
        verify(transactionDao).deleteGovernorStatsByChanges(anyList());
        verify(governorUploadDao).deleteGovernorIfNoStats("new-governor");
        verify(transactionDao).markRolledBack(Collections.singletonList(transactionId));
    }

    @Test
    void doesNotRollbackPendingTransaction() {
        String transactionId = UUID.randomUUID().toString();
        when(transactionDao.findTransactionForUpdate(transactionId))
                .thenReturn(transaction("pending", "{}"));

        assertThrows(BizException.class,
                () -> transactionService.rollbackTransaction(request(transactionId)));

        verify(transactionDao, never()).deleteGovernorStatsByChanges(anyList());
        verify(transactionDao, never()).markRolledBack(anyList());
    }

    @Test
    void rejectsRollbackWhenANewerUploadTouchesTheSameGovernor() throws Exception {
        String transactionId = UUID.randomUUID().toString();
        TransactionRecord transaction = transaction("completed", transactionData(
                new TransactionChange("governor-1", false,
                        Collections.singletonList("2022-07-04T00:00"))));
        when(transactionDao.findTransactionForUpdate(transactionId)).thenReturn(transaction);
        when(governorUploadDao.findGovernorForUpdate("governor-1"))
                .thenReturn(new GovernorMaster());
        when(transactionDao.existsNewerCompletedTransaction(eq(transactionId), eq("governor-1")))
                .thenReturn(true);

        assertThrows(BizException.class,
                () -> transactionService.rollbackTransaction(request(transactionId)));

        verify(transactionDao, never()).deleteGovernorStatsByChanges(anyList());
        verify(governorUploadDao, never()).deleteGovernorIfNoStats("governor-1");
    }

    @Test
    void repeatedRollbackIsIdempotent() {
        String transactionId = UUID.randomUUID().toString();
        when(transactionDao.findTransactionForUpdate(transactionId))
                .thenReturn(transaction("rolled_back", "{}"));

        RollbackResponse response = transactionService.rollbackTransaction(request(transactionId));

        assertEquals("이미 rollback된 트랜잭션입니다.", response.getMessage());
        verify(transactionDao, never()).deleteGovernorStatsByChanges(anyList());
    }

    private RollbackRequest request(String transactionId) {
        RollbackRequest request = new RollbackRequest();
        request.setTransactionId(transactionId);
        return request;
    }

    private TransactionRecord transaction(String status, TransactionData data) throws Exception {
        return transaction(status, new ObjectMapper().writeValueAsString(data));
    }

    private TransactionRecord transaction(String status, String data) {
        TransactionRecord transaction = new TransactionRecord();
        transaction.setStatus(status);
        transaction.setData(data);
        return transaction;
    }

    private TransactionData transactionData(TransactionChange... changes) {
        return new TransactionData(1, "test.xlsx", Arrays.asList(changes));
    }
}
