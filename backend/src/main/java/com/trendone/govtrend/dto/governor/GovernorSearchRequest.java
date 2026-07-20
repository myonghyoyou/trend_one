package com.trendone.govtrend.dto.governor;

import lombok.Data;

@Data
public class GovernorSearchRequest {

    private String startDate;
    private String endDate;
    private String inspctDay;
    private String srchCity;
    private String srchCntnt;
}
