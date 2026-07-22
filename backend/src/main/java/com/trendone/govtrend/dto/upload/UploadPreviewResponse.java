package com.trendone.govtrend.dto.upload;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadPreviewResponse {

    private String fileName;
    private long fileSize;
    private String fileSha256;
    private UploadImpactAnalysis impact;
}
