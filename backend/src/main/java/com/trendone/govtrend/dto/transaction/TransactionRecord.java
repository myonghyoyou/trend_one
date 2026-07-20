package com.trendone.govtrend.dto.transaction;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

@Data
public class TransactionRecord {

    @JsonProperty("transaction_id")
    private String transactionId;

    private String status;
    private String data;

    @JsonProperty("created_at")
    private String createdAt;

    @JsonProperty("updated_at")
    private String updatedAt;
}
