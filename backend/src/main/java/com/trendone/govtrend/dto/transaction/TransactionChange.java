package com.trendone.govtrend.dto.transaction;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionChange {

    @JsonProperty("gvrnr_uid")
    private String gvrnrUid;

    @JsonProperty("created_governor")
    private boolean createdGovernor;

    @JsonProperty("record_dttms")
    private List<String> recordDttms;
}
