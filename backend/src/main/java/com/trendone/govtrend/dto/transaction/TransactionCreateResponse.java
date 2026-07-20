package com.trendone.govtrend.dto.transaction;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TransactionCreateResponse {

    @JsonProperty("transaction_id")
    private String transactionId;

    private String status;
}
