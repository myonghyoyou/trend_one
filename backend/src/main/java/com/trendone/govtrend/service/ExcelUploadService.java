package com.trendone.govtrend.service;

import org.springframework.web.multipart.MultipartFile;

import com.trendone.govtrend.dto.upload.UploadResponse;
import com.trendone.govtrend.dto.upload.UploadPreviewResponse;

public interface ExcelUploadService {

    UploadResponse upload(MultipartFile file, String mbrUid);

    UploadPreviewResponse preview(MultipartFile file, String mbrUid);

    UploadResponse upload(
            MultipartFile file,
            String mbrUid,
            String previewSha256,
            String previewFingerprint);

    UploadResponse upload(
            MultipartFile file,
            String mbrUid,
            String previewSha256,
            String previewFingerprint,
            boolean allowDeleteOnly);
}
