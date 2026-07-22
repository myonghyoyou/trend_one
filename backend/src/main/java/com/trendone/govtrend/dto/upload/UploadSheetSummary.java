package com.trendone.govtrend.dto.upload;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadSheetSummary {

    private String sheetName;
    private String inspctDay;
    private int governorCount;
    private int rowCount;
    private int measurementCount;
}
