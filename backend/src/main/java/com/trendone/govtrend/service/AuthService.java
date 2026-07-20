package com.trendone.govtrend.service;

import javax.servlet.http.HttpServletRequest;

import com.trendone.govtrend.common.ResponseDto;
import com.trendone.govtrend.dto.auth.LoginRequest;
import com.trendone.govtrend.dto.auth.SessionStatusResponse;
public interface AuthService {

    void login(LoginRequest loginRequest, HttpServletRequest request);

    void logout(HttpServletRequest request);

    ResponseDto<SessionStatusResponse> getSessionStatus(HttpServletRequest request);
}
