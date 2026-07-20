package com.trendone.govtrend.dto.transaction;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class TransactionListResponse {

    private List<TransactionRecord> transactionsList;
}
