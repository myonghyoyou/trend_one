package com.trendone.govtrend.dao;

import java.util.List;

import com.trendone.govtrend.dto.governor.GovernorListItem;
import com.trendone.govtrend.dto.governor.GovernorSearchRequest;

public interface GovernorDao {

    List<GovernorListItem> findGovernorList(GovernorSearchRequest request);
}
