package com.trendone.govtrend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@AllArgsConstructor
public class SessionStatusResponse {

    @JsonProperty("isLoggedIn")
    private boolean loggedIn;
}
