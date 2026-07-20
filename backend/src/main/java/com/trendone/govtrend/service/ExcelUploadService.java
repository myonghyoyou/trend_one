package com.trendone.govtrend.service;

import org.springframework.web.multipart.MultipartFile;

import com.trendone.govtrend.dto.upload.UploadResponse;

public interface ExcelUploadService {

    UploadResponse upload(MultipartFile file, String mbrUid);
}
