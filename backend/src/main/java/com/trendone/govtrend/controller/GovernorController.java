package com.trendone.govtrend.controller;

import com.trendone.govtrend.common.ResponseDto;
import com.trendone.govtrend.dto.governor.GovernorListResponse;
import com.trendone.govtrend.dto.governor.GovernorSearchRequest;
import com.trendone.govtrend.dto.governor.GovernorStatsRequest;
import com.trendone.govtrend.dto.governor.GovernorStatsResponse;
import com.trendone.govtrend.service.GovernorService;
import com.trendone.govtrend.service.GovernorStatService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/governors")
public class GovernorController {

    private final GovernorService governorService;
    private final GovernorStatService governorStatService;

    public GovernorController(GovernorService governorService, GovernorStatService governorStatService) {
        this.governorService = governorService;
        this.governorStatService = governorStatService;
    }

    @PostMapping("/list")
    public ResponseEntity<ResponseDto<GovernorListResponse>> list(
            @RequestBody GovernorSearchRequest request) {
        return ResponseEntity.ok(ResponseDto.ok(governorService.search(request)));
    }

    @PostMapping("/stats")
    public ResponseEntity<ResponseDto<GovernorStatsResponse>> stats(
            @RequestBody GovernorStatsRequest request) {
        return ResponseEntity.ok(ResponseDto.ok(governorStatService.search(request)));
    }

    @PostMapping("/print-stats")
    public ResponseEntity<ResponseDto<GovernorStatsResponse>> printStats(
            @RequestBody GovernorStatsRequest request) {
        return ResponseEntity.ok(ResponseDto.ok(governorStatService.searchForPrint(request)));
    }
}
