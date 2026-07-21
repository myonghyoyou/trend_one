package com.trendone.govtrend.dao;

import org.apache.ibatis.annotations.Param;

public interface GovernorUploadStageDao {

    int deleteStage(@Param("transactionId") String transactionId);

    int deleteExistingGovernorStats(@Param("transactionId") String transactionId);

    int insertGovernorStats(
            @Param("transactionId") String transactionId,
            @Param("mbrUid") String mbrUid);
}
