package com.trendone.govtrend.controller;

import com.trendone.govtrend.common.ResponseDto;
import com.trendone.govtrend.dto.transaction.RollbackResponse;
import com.trendone.govtrend.dto.transaction.TransactionCreateResponse;
import com.trendone.govtrend.dto.transaction.TransactionListResponse;
import com.trendone.govtrend.dto.transaction.RollbackRequest;
import com.trendone.govtrend.service.TransactionService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<ResponseDto<TransactionCreateResponse>> create() {
        return ResponseEntity.ok(ResponseDto.ok(transactionService.createPending()));
    }

    @GetMapping("/in-progress")
    public ResponseEntity<ResponseDto<TransactionListResponse>> findActive() {
        return ResponseEntity.ok(ResponseDto.ok(transactionService.findActiveTransactions()));
    }

    @PostMapping("/rollback")
    public ResponseEntity<ResponseDto<RollbackResponse>> rollback(
            @RequestBody RollbackRequest rollbackRequest) {
        return ResponseEntity.ok(ResponseDto.ok(
                transactionService.rollbackTransaction(rollbackRequest)));
    }
}
