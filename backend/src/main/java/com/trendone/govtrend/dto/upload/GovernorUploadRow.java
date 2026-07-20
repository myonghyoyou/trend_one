package com.trendone.govtrend.dto.upload;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GovernorUploadRow {

    private LocalDateTime recordDttm;
    private List<BigDecimal> gvrnrPress2Values;
}
