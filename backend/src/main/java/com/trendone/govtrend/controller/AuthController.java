package com.trendone.govtrend.controller;

import javax.servlet.http.HttpServletRequest;

import com.trendone.govtrend.common.ResponseDto;
import com.trendone.govtrend.dto.auth.LoginRequest;
import com.trendone.govtrend.dto.auth.SessionStatusResponse;
import com.trendone.govtrend.service.AuthService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ResponseDto<?>> login(
            @RequestBody(required = false) LoginRequest loginRequest,
            HttpServletRequest request) {
        authService.login(loginRequest, request);
        return ResponseEntity.ok(ResponseDto.ok());
    }

    @PostMapping("/logout")
    public ResponseEntity<ResponseDto<?>> logout(HttpServletRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ResponseDto.ok());
    }

    @GetMapping("/session")
    public ResponseEntity<ResponseDto<SessionStatusResponse>> getSession(HttpServletRequest request) {
        return ResponseEntity.ok(authService.getSessionStatus(request));
    }
}
