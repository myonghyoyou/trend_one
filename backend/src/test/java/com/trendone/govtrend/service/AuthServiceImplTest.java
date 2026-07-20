package com.trendone.govtrend.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import com.trendone.govtrend.dto.auth.LoginRequest;
import com.trendone.govtrend.exception.BizException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    private static final String SESSION_ATTRIBUTE_NAME = "sessionExists";

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpSession session;

    @Test
    void allowsDevCredentialsWhenDevLoginIsEnabled() {
        AuthServiceImpl authService = authService(true, "admin", "123");
        when(request.getSession(true)).thenReturn(session);

        authService.login(loginRequest("admin", "123"), request);

        verify(session).setAttribute("mbrUid", "admin");
        verify(session).setAttribute(SESSION_ATTRIBUTE_NAME, Boolean.TRUE);
    }

    @Test
    void rejectsDevCredentialsWhenDevLoginIsDisabled() {
        AuthServiceImpl authService = authService(false, "admin", "123");

        assertThrows(BizException.class,
                () -> authService.login(loginRequest("admin", "123"), request));
    }

    @Test
    void allowsConfiguredCredentialsEvenWhenDevLoginIsDisabled() {
        AuthServiceImpl authService = new AuthServiceImpl(
                "configured-user", "configured-password", false,
                "admin", "123", SESSION_ATTRIBUTE_NAME);
        when(request.getSession(true)).thenReturn(session);

        authService.login(loginRequest("configured-user", "configured-password"), request);

        verify(session).setAttribute("mbrUid", "configured-user");
        verify(session).setAttribute(SESSION_ATTRIBUTE_NAME, Boolean.TRUE);
    }

    private AuthServiceImpl authService(boolean devLoginEnabled, String devLoginId, String devLoginPassword) {
        return new AuthServiceImpl(
                "", "", devLoginEnabled,
                devLoginId, devLoginPassword, SESSION_ATTRIBUTE_NAME);
    }

    private LoginRequest loginRequest(String loginId, String password) {
        LoginRequest request = new LoginRequest();
        request.setLoginId(loginId);
        request.setPassword(password);
        return request;
    }
}
