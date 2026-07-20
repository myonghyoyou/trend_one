package com.trendone.govtrend.service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.dao.GovernorDao;
import com.trendone.govtrend.dto.governor.GovernorListResponse;
import com.trendone.govtrend.dto.governor.GovernorSearchRequest;
import com.trendone.govtrend.exception.BizException;

import org.springframework.stereotype.Service;

@Service
public class GovernorServiceImpl implements GovernorService {

    private static final Set<String> REGION_CODES = new HashSet<>(Arrays.asList("1100", "3100"));
    private static final Set<String> INSPECTION_DAYS = new HashSet<>(
            Arrays.asList("MON", "TUE", "WED", "THU", "FRI"));
    private static final String SPECIAL_CHAR_PATTERN = "[~!@#$%^&*()_+|<>?:{}]";

    private final GovernorDao governorDao;

    public GovernorServiceImpl(GovernorDao governorDao) {
        this.governorDao = governorDao;
    }

    @Override
    public GovernorListResponse search(GovernorSearchRequest request) {
        validate(request);
        return new GovernorListResponse(governorDao.findGovernorList(request));
    }

    private void validate(GovernorSearchRequest request) {
        if (request == null || isBlank(request.getStartDate())) {
            throw invalid("시작일을 입력하세요.");
        }
        if (isBlank(request.getEndDate())) {
            throw invalid("종료일을 입력하세요.");
        }

        LocalDate startDate;
        LocalDate endDate;
        try {
            startDate = LocalDate.parse(request.getStartDate());
            endDate = LocalDate.parse(request.getEndDate());
        } catch (DateTimeParseException exception) {
            throw invalid("날짜 형식이 올바르지 않습니다.");
        }

        if (endDate.isBefore(startDate)) {
            throw invalid("종료일은 시작일 이후여야 합니다.");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > 30) {
            throw invalid("날짜 범위는 최대 30일입니다.");
        }

        if (!isBlank(request.getSrchCity()) && !REGION_CODES.contains(request.getSrchCity())) {
            throw invalid("지역 코드가 올바르지 않습니다.");
        }
        if (!isBlank(request.getInspctDay()) && !INSPECTION_DAYS.contains(request.getInspctDay())) {
            throw invalid("점검요일 값이 올바르지 않습니다.");
        }
        if (request.getSrchCntnt() != null && request.getSrchCntnt().matches(".*" + SPECIAL_CHAR_PATTERN + ".*")) {
            throw invalid("검색어에 특수문자를 사용할 수 없습니다.");
        }
    }

    private BizException invalid(String message) {
        return new BizException(ErrorCode.INPUT_VALUE_INVALID, message);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
