package com.trendone.govtrend.dto.transaction;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TransactionStatusResponse {

    @JsonProperty("transaction_id")
    private String transactionId;

    private String status;

    @JsonProperty("progress_percent")
    private int progressPercent;

    @JsonProperty("progress_message")
    private String progressMessage;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;
}
