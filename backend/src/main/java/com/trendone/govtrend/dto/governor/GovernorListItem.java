package com.trendone.govtrend.dto.governor;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
public class GovernorListItem {

    @JsonProperty("gvrnr_uid")
    private String gvrnrUid;

    @JsonProperty("gvrnr_nm")
    private String gvrnrNm;

    @JsonProperty("inspct_day")
    private String inspctDay;

    @JsonProperty("gvrnr_stat_cnt")
    private Integer gvrnrStatCnt;

    @JsonProperty("cd_name")
    private String cdName;
}
