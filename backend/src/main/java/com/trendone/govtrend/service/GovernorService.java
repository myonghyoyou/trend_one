package com.trendone.govtrend.service;

import com.trendone.govtrend.dto.governor.GovernorListResponse;
import com.trendone.govtrend.dto.governor.GovernorSearchRequest;
public interface GovernorService {

    GovernorListResponse search(GovernorSearchRequest request);
}
