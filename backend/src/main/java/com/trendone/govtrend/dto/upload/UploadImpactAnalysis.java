package com.trendone.govtrend.dto.upload;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadImpactAnalysis {

    private int governorCount;
    private int newGovernorCount;
    private int existingGovernorCount;
    private int inspectionDayChangeCount;
    private int uploadRecordCount;
    private int existingAffectedRecordCount;
    private int replacementRecordCount;
    private int newRecordCount;
    private int deleteOnlyRecordCount;
    private String databaseFingerprint;
    private List<UploadSheetSummary> sheets;
    private List<String> warnings;

    public boolean hasDeleteOnlyRecords() {
        return deleteOnlyRecordCount > 0;
    }
}
