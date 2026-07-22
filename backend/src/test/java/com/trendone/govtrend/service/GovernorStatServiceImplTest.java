package com.trendone.govtrend.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.trendone.govtrend.dao.GovernorStatDao;
import com.trendone.govtrend.dto.governor.GovernorStatsRequest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GovernorStatServiceImplTest {

    @Mock
    private GovernorStatDao governorStatDao;

    private GovernorStatServiceImpl governorStatService;

    @BeforeEach
    void setUp() {
        governorStatService = new GovernorStatServiceImpl(governorStatDao);
    }

    @Test
    void acceptsGeneratedGovernorUidWithUnderscore() {
        GovernorStatsRequest request = new GovernorStatsRequest();
        request.setStartDate("2022-04-04");
        request.setEndDate("2022-04-17");
        request.setGvrnrUids("gvrnr_1657874507889,gvrnr_1657874690816");
        request.setGvrnrNms("용현신도10차.P2,용현신도11차.P2");
        request.setIntervalNum("1");
        when(governorStatDao.findGovernorStats(any())).thenReturn(Collections.emptyList());

        governorStatService.search(request);

        verify(governorStatDao).findGovernorStats(request);
    }

    @Test
    void printSearchAcceptsMoreThanThreeGovernorUidsAndUsesPrintQuery() {
        GovernorStatsRequest request = new GovernorStatsRequest();
        request.setStartDate("2022-04-04");
        request.setEndDate("2022-04-17");
        request.setGvrnrUids("gvrnr_1,gvrnr_2,gvrnr_3,gvrnr_4");
        request.setGvrnrNms("정압기1,정압기2,정압기3,정압기4");
        request.setIntervalNum("1");
        when(governorStatDao.findGovernorPrintStats(any())).thenReturn(Collections.emptyList());

        governorStatService.searchForPrint(request);

        verify(governorStatDao).findGovernorPrintStats(request);
        verify(governorStatDao, never()).findGovernorStats(request);
    }

    @Test
    void printSearchRejectsInvalidGovernorUid() {
        GovernorStatsRequest request = new GovernorStatsRequest();
        request.setStartDate("2022-04-04");
        request.setEndDate("2022-04-17");
        request.setGvrnrUids("gvrnr_1,invalid uid");
        request.setIntervalNum("1");

        assertThrows(RuntimeException.class, () -> governorStatService.searchForPrint(request));
        verify(governorStatDao, never()).findGovernorPrintStats(any());
    }
}
