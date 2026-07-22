package com.trendone.govtrend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;

import com.trendone.govtrend.dao.GovernorUploadDao;
import com.trendone.govtrend.dto.upload.GovernorMaster;
import com.trendone.govtrend.dto.upload.GovernorUploadColumn;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.GovernorUploadExistingStat;
import com.trendone.govtrend.dto.upload.GovernorUploadRow;
import com.trendone.govtrend.dto.upload.GovernorUploadSheet;
import com.trendone.govtrend.dto.upload.UploadImpactAnalysis;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UploadImpactAnalyzerTest {

    @Mock
    private GovernorUploadDao governorUploadDao;

    @Test
    void calculatesReplacementNewAndDeleteOnlyRowsFromCurrentDeletionScope() {
        GovernorMaster governor = new GovernorMaster();
        governor.setGvrnrUid("gvrnr-1");
        governor.setGvrnrNm("상계우방.P2");
        governor.setCateCd("1100");
        governor.setInspctDay("TUE");
        when(governorUploadDao.findGovernors(anyList())).thenReturn(Collections.singletonList(governor));
        when(governorUploadDao.findExistingGovernorStats(anyList())).thenReturn(Arrays.asList(
                new GovernorUploadExistingStat("gvrnr-1", LocalDateTime.of(2026, 7, 6, 0, 10)),
                new GovernorUploadExistingStat("gvrnr-1", LocalDateTime.of(2026, 7, 6, 0, 20)),
                new GovernorUploadExistingStat("gvrnr-1", LocalDateTime.of(2026, 7, 6, 0, 30))));

        GovernorUploadData data = new GovernorUploadData(Collections.singletonList(
                new GovernorUploadSheet(
                        "TUE",
                        Collections.singletonList(new GovernorUploadColumn("상계우방.P2", "1100", 1)),
                        Arrays.asList(
                                new GovernorUploadRow(
                                        LocalDateTime.of(2026, 7, 6, 0, 10),
                                        Collections.singletonList(new BigDecimal("2.1"))),
                                new GovernorUploadRow(
                                        LocalDateTime.of(2026, 7, 6, 0, 20),
                                        Collections.singletonList(new BigDecimal("2.2"))),
                                new GovernorUploadRow(
                                        LocalDateTime.of(2026, 7, 6, 0, 40),
                                        Collections.singletonList(new BigDecimal("2.3")))))));

        UploadImpactAnalysis result = new UploadImpactAnalyzer(governorUploadDao).analyze(data);

        assertEquals(3, result.getUploadRecordCount());
        assertEquals(3, result.getExistingAffectedRecordCount());
        assertEquals(2, result.getReplacementRecordCount());
        assertEquals(1, result.getDeleteOnlyRecordCount());
        assertEquals(1, result.getNewRecordCount());
    }
}
