package com.trendone.govtrend.dto.auth;

import lombok.Data;

@Data
public class LoginRequest {

    private String loginId;
    private String password;
}
