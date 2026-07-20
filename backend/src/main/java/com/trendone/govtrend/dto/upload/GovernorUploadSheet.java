package com.trendone.govtrend.dto.upload;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GovernorUploadSheet {

    private String inspctDay;
    private List<GovernorUploadColumn> columns;
    private List<GovernorUploadRow> rows;
}
