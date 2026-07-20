package com.trendone.govtrend.dao;

import java.time.LocalDateTime;

import com.trendone.govtrend.dto.upload.GovernorMaster;
import com.trendone.govtrend.dto.upload.GovernorStatInsert;

import org.apache.ibatis.annotations.Param;

public interface GovernorUploadDao {

    GovernorMaster findGovernor(@Param("gvrnrNm") String gvrnrNm, @Param("cateCd") String cateCd);

    GovernorMaster findGovernorForUpdate(@Param("gvrnrUid") String gvrnrUid);

    void insertGovernor(GovernorMaster governorMaster);

    int deleteGovernorStats(
            @Param("gvrnrUid") String gvrnrUid,
            @Param("startDttm") LocalDateTime startDttm,
            @Param("endDttm") LocalDateTime endDttm);

    void insertGovernorStat(GovernorStatInsert statInsert);

    int deleteGovernorIfNoStats(@Param("gvrnrUid") String gvrnrUid);
}
