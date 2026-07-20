package com.trendone.govtrend.dto.governor;

import java.util.List;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GovernorStatsResponse {

    private List<String> xAxisList;
    private Map<String, GovernorStatItem> statDataObj;
}
