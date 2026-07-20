package com.trendone.govtrend.dto.governor;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
public class GovernorStatItem {

    @JsonProperty("gvrnr_nm")
    private String gvrnrNm;

    @JsonProperty("gvrnr_press2")
    private List<Double> gvrnrPress2;

    @JsonProperty("gvrnr_press2_chart")
    private List<List<Object>> gvrnrPress2Chart;

    @JsonProperty("gvrnr_trnsps2")
    private List<Integer> gvrnrTrnsps2;

    @JsonProperty("record_dttm")
    private List<String> recordDttm;
}
