package com.trendone.govtrend.dto.upload;

import java.util.List;

import lombok.Data;

@Data
public class GovernorUploadSheet {

    private String sheetName;
    private String inspctDay;
    private List<GovernorUploadColumn> columns;
    private List<GovernorUploadRow> rows;

    public GovernorUploadSheet(String inspctDay, List<GovernorUploadColumn> columns, List<GovernorUploadRow> rows) {
        this(null, inspctDay, columns, rows);
    }

    public GovernorUploadSheet(
            String sheetName,
            String inspctDay,
            List<GovernorUploadColumn> columns,
            List<GovernorUploadRow> rows) {
        this.sheetName = sheetName;
        this.inspctDay = inspctDay;
        this.columns = columns;
        this.rows = rows;
    }
}
