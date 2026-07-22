package com.trendone.govtrend.service;

import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.UploadResponse;

public interface UploadTransactionService {

    UploadResponse processUpload(
            String transactionId,
            GovernorUploadData uploadData,
            String mbrUid,
            String fileName,
            String expectedFingerprint);
}
