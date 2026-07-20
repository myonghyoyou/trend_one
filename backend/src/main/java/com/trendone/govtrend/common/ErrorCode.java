package com.trendone.govtrend.common;

import lombok.Getter;

@Getter
public enum ErrorCode {

    MSG_PROC_FAIL("처리에 오류가 발생하였습니다.", -1),
    METHOD_NOT_ALLOWED("지원하지 않은 HTTP method 호출입니다.", 400),
    CONTENT_TYPE_NOT_ALLOWED("지원하지 않은 Content type 호출입니다.", 400),
    DATABIND_NOT_ALLOWED("데이터 타입에 맞지 않는 요청입니다.", 960),
    INPUT_HEADER_INVALID("헤더 파라미터가 누락되었습니다.", 970),
    EMPTY_SESSION("세션 정보가 없습니다.", 980),
    ACCESS_AUTH_DENIED("접근 권한이 없습니다.", 990),
    INPUT_VALUE_INVALID("잘못된 파라미터를 입력했습니다.", 1000),
    FILE_REQUIRED("필수 파일이 누락되었습니다.", 1009);

    private final String message;
    private final int code;

    ErrorCode(String message, int code) {
        this.message = message;
        this.code = code;
    }
}
