package com.trendone.govtrend.dao;

import org.apache.ibatis.annotations.Param;

public interface TransactionProgressDao {

    void upsertProgress(
            @Param("transactionId") String transactionId,
            @Param("progressPercent") int progressPercent,
            @Param("progressMessage") String progressMessage);
}
