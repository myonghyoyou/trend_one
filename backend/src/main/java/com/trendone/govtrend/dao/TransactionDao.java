package com.trendone.govtrend.dao;

import java.util.List;

import com.trendone.govtrend.dto.transaction.TransactionRecord;
import com.trendone.govtrend.dto.transaction.TransactionChange;

import org.apache.ibatis.annotations.Param;

public interface TransactionDao {

    void insertTransaction(TransactionRecord transaction);

    void updateTransaction(
            @Param("transactionId") String transactionId,
            @Param("status") String status,
            @Param("data") String data);

    List<TransactionRecord> findActiveTransactions();

    List<TransactionRecord> findActiveTransactionsForUpdate();

    TransactionRecord findTransactionForUpdate(@Param("transactionId") String transactionId);

    boolean existsNewerCompletedTransaction(
            @Param("transactionId") String transactionId,
            @Param("gvrnrUid") String gvrnrUid);

    int deleteGovernorStatsByChanges(@Param("items") List<TransactionChange> items);

    int markRolledBack(@Param("transactionIds") List<String> transactionIds);
}
