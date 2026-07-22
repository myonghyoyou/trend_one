package com.trendone.govtrend.dto.upload;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GovernorUploadStatScope {

    private String gvrnrUid;
    private LocalDateTime startDttm;
    private LocalDateTime endDttm;
}
