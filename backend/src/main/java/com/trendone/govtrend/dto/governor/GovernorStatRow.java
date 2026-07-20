package com.trendone.govtrend.dto.governor;

import lombok.Data;

@Data
public class GovernorStatRow {

    private String gvrnrUid;
    private Double gvrnrPress1;
    private Double gvrnrPress2;
    private Integer gvrnrTrnsps1;
    private Integer gvrnrTrnsps2;
    private String recordDttm;
}
