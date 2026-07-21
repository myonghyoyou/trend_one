package com.trendone.govtrend.dto.upload;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GovernorUploadStageRow {

    private String gvrnrUid;
    private LocalDateTime recordDttm;
    private BigDecimal gvrnrPress2;
}
