package com.trendone.govtrend.dto.governor;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

class GovernorStatsResponseTest {

    @Test
    void serializesXAxisListWithUppercaseA() throws Exception {
        List<String> xAxisList = List.of("2026-07-06 09:00");
        Map<String, GovernorStatItem> statDataObj = Collections.emptyMap();
        GovernorStatsResponse response = new GovernorStatsResponse(xAxisList, statDataObj);

        String json = new ObjectMapper().writeValueAsString(response);

        assertTrue(json.contains("\"xAxisList\""),
                () -> "expected JSON to contain \"xAxisList\" key but was: " + json);
    }
}
