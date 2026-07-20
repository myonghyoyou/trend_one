package com.trendone.govtrend.service;

import com.trendone.govtrend.dto.transaction.RollbackResponse;
import com.trendone.govtrend.dto.transaction.RollbackRequest;
import com.trendone.govtrend.dto.transaction.TransactionCreateResponse;
import com.trendone.govtrend.dto.transaction.TransactionListResponse;

public interface TransactionService {

    TransactionCreateResponse createPending();

    void markFailed(String transactionId, String data);

    TransactionListResponse findActiveTransactions();

    RollbackResponse rollbackTransaction(RollbackRequest request);
}
