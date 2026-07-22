package com.trendone.govtrend.dto.upload;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GovernorUploadExistingStat {

    private String gvrnrUid;
    private LocalDateTime recordDttm;
}
