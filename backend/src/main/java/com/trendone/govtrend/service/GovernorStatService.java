package com.trendone.govtrend.service;

import com.trendone.govtrend.dto.governor.GovernorStatsRequest;
import com.trendone.govtrend.dto.governor.GovernorStatsResponse;
public interface GovernorStatService {

    GovernorStatsResponse search(GovernorStatsRequest request);

    GovernorStatsResponse searchForPrint(GovernorStatsRequest request);
}
