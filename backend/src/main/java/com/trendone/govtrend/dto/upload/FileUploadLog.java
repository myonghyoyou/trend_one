package com.trendone.govtrend.dto.upload;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FileUploadLog {

    private String mbrUid;
    private String successYn;
    private String fileName;
}
