package com.trendone.govtrend.dao;

import java.time.LocalDateTime;
import java.util.List;

import com.trendone.govtrend.dto.upload.GovernorMaster;
import com.trendone.govtrend.dto.upload.GovernorStatInsert;
import com.trendone.govtrend.dto.upload.GovernorUploadColumn;
import com.trendone.govtrend.dto.upload.GovernorUploadExistingStat;
import com.trendone.govtrend.dto.upload.GovernorUploadStatScope;

import org.apache.ibatis.annotations.Param;

public interface GovernorUploadDao {

    GovernorMaster findGovernor(@Param("gvrnrNm") String gvrnrNm, @Param("cateCd") String cateCd);

    List<GovernorMaster> findGovernors(@Param("items") List<GovernorUploadColumn> items);

    List<GovernorUploadExistingStat> findExistingGovernorStats(
            @Param("scopes") List<GovernorUploadStatScope> scopes);

    GovernorMaster findGovernorForUpdate(@Param("gvrnrUid") String gvrnrUid);

    void insertGovernor(GovernorMaster governorMaster);

    void updateGovernorInspectionDay(
            @Param("gvrnrUid") String gvrnrUid,
            @Param("inspctDay") String inspctDay);

    int deleteGovernorStats(
            @Param("gvrnrUid") String gvrnrUid,
            @Param("startDttm") LocalDateTime startDttm,
            @Param("endDttm") LocalDateTime endDttm);

    void insertGovernorStat(GovernorStatInsert statInsert);

    int deleteGovernorIfNoStats(@Param("gvrnrUid") String gvrnrUid);
}
