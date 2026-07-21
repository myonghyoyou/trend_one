package com.trendone.govtrend.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Collections;

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
        when(governorStatDao.findGovernorStats(any())).thenReturn(Collections.emptyList());
    }

    @Test
    void acceptsGeneratedGovernorUidWithUnderscore() {
        GovernorStatsRequest request = new GovernorStatsRequest();
        request.setStartDate("2022-04-04");
        request.setEndDate("2022-04-17");
        request.setGvrnrUids("gvrnr_1657874507889,gvrnr_1657874690816");
        request.setGvrnrNms("용현신도10차.P2,용현신도11차.P2");
        request.setIntervalNum("1");

        governorStatService.search(request);

        verify(governorStatDao).findGovernorStats(request);
    }
}
