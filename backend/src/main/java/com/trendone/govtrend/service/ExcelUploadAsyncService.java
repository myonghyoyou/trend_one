package com.trendone.govtrend.service;

import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.exception.BizException;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ExcelUploadAsyncService {

    private final UploadTransactionService uploadTransactionService;
    private final TransactionService transactionService;
    private final TransactionProgressService transactionProgressService;

    public ExcelUploadAsyncService(
            UploadTransactionService uploadTransactionService,
            TransactionService transactionService,
            TransactionProgressService transactionProgressService) {
        this.uploadTransactionService = uploadTransactionService;
        this.transactionService = transactionService;
        this.transactionProgressService = transactionProgressService;
    }

    @Async("uploadTaskExecutor")
    public void process(
            String transactionId,
            GovernorUploadData uploadData,
            String mbrUid,
            String fileName,
            String expectedFingerprint) {
        try {
            transactionService.markInProgress(transactionId);
            transactionProgressService.update(transactionId, 10, "업로드 처리를 준비하고 있습니다.");
            uploadTransactionService.processUpload(
                    transactionId, uploadData, mbrUid, fileName, expectedFingerprint);
            transactionProgressService.update(transactionId, 100, "업로드가 완료되었습니다.");
        } catch (BizException exception) {
            markFailure(transactionId, exception.getMessage());
        } catch (Exception exception) {
            markFailure(transactionId, "파일 업로드에 실패하였습니다.");
        }
    }

    private void markFailure(String transactionId, String reason) {
        try {
            transactionService.markFailed(transactionId, reason);
        } finally {
            transactionProgressService.update(transactionId, 100, reason);
        }
    }
}
