package com.trendone.govtrend.dto.upload;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadResponse {

    @JsonProperty("transaction_id")
    private String transactionId;

    private String status;
}
