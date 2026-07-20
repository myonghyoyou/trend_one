package com.trendone.govtrend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.common.ResponseDto;
import com.trendone.govtrend.dto.auth.LoginRequest;
import com.trendone.govtrend.dto.auth.SessionStatusResponse;
import com.trendone.govtrend.exception.BizException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private static final String MEMBER_UID_ATTRIBUTE = "mbrUid";

    private final String configuredLoginId;
    private final String configuredPassword;
    private final boolean devLoginEnabled;
    private final String devLoginId;
    private final String devLoginPassword;
    private final String sessionAttributeName;

    public AuthServiceImpl(
            @Value("${app.login.id:}") String configuredLoginId,
            @Value("${app.login.password:}") String configuredPassword,
            @Value("${app.login.dev.enabled:false}") boolean devLoginEnabled,
            @Value("${app.login.dev.id:}") String devLoginId,
            @Value("${app.login.dev.password:}") String devLoginPassword,
            @Value("${app.session.attribute-name:sessionExists}") String sessionAttributeName) {
        this.configuredLoginId = configuredLoginId;
        this.configuredPassword = configuredPassword;
        this.devLoginEnabled = devLoginEnabled;
        this.devLoginId = devLoginId;
        this.devLoginPassword = devLoginPassword;
        this.sessionAttributeName = sessionAttributeName;
    }

    @Override
    public void login(LoginRequest loginRequest, HttpServletRequest request) {
        if (loginRequest == null
                || isBlank(loginRequest.getLoginId())
                || isBlank(loginRequest.getPassword())) {
            throw new BizException(ErrorCode.INPUT_VALUE_INVALID, "아이디와 비밀번호를 입력하세요.");
        }

        boolean configuredAccountMatched = matches(loginRequest.getLoginId(), configuredLoginId)
                && matches(loginRequest.getPassword(), configuredPassword);
        boolean devAccountMatched = devLoginEnabled
                && matches(loginRequest.getLoginId(), devLoginId)
                && matches(loginRequest.getPassword(), devLoginPassword);

        if (!configuredAccountMatched && !devAccountMatched) {
            throw new BizException(ErrorCode.MSG_PROC_FAIL, "아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        HttpSession session = request.getSession(true);
        session.setAttribute(MEMBER_UID_ATTRIBUTE, loginRequest.getLoginId());
        session.setAttribute(sessionAttributeName, Boolean.TRUE);
    }

    @Override
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    @Override
    public ResponseDto<SessionStatusResponse> getSessionStatus(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        boolean loggedIn = session != null
                && Boolean.TRUE.equals(session.getAttribute(sessionAttributeName));
        return ResponseDto.ok(new SessionStatusResponse(loggedIn));
    }

    private boolean matches(String actual, String expected) {
        if (isBlank(expected)) {
            return false;
        }
        return MessageDigest.isEqual(
                actual.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
