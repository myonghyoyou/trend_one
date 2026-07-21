package com.trendone.govtrend.dto.transaction;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class TransactionChange {

    @JsonProperty("gvrnr_uid")
    private String gvrnrUid;

    @JsonProperty("created_governor")
    private boolean createdGovernor;

    @JsonProperty("record_dttms")
    private List<String> recordDttms;

    @JsonProperty("previous_inspct_day")
    private String previousInspctDay;

    public TransactionChange(String gvrnrUid, boolean createdGovernor, List<String> recordDttms) {
        this(gvrnrUid, createdGovernor, recordDttms, null);
    }

    public TransactionChange(
            String gvrnrUid,
            boolean createdGovernor,
            List<String> recordDttms,
            String previousInspctDay) {
        this.gvrnrUid = gvrnrUid;
        this.createdGovernor = createdGovernor;
        this.recordDttms = recordDttms;
        this.previousInspctDay = previousInspctDay;
    }
}
