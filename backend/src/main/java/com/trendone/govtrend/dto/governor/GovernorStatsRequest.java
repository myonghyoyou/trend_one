package com.trendone.govtrend.dto.governor;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.Data;

@Data
public class GovernorStatsRequest {

    private String gvrnrUids;
    private String gvrnrNms;
    private String startDate;
    private String endDate;
    private String intervalNum;

    @JsonIgnore
    private List<String> governorUidList;
}
