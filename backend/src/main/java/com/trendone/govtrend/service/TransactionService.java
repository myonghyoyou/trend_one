package com.trendone.govtrend.service;

import com.trendone.govtrend.dto.transaction.RollbackResponse;
import com.trendone.govtrend.dto.transaction.RollbackRequest;
import com.trendone.govtrend.dto.transaction.TransactionCreateResponse;
import com.trendone.govtrend.dto.transaction.TransactionListResponse;
import com.trendone.govtrend.dto.transaction.TransactionStatusResponse;

public interface TransactionService {

    TransactionCreateResponse createPending();

    void markFailed(String transactionId, String data);

    void markInProgress(String transactionId);

    TransactionListResponse findActiveTransactions();

    TransactionStatusResponse findTransactionStatus(String transactionId);

    RollbackResponse rollbackTransaction(RollbackRequest request);
}
