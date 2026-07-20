package com.trendone.govtrend.dao;

import java.util.List;

import com.trendone.govtrend.dto.governor.GovernorStatRow;
import com.trendone.govtrend.dto.governor.GovernorStatsRequest;

public interface GovernorStatDao {

    List<GovernorStatRow> findGovernorStats(GovernorStatsRequest request);
}
