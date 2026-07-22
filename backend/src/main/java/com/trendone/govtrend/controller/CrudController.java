package com.trendone.govtrend.controller;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import com.trendone.govtrend.common.ResponseDto;
import com.trendone.govtrend.dto.upload.UploadResponse;
import com.trendone.govtrend.dto.upload.UploadPreviewResponse;
import com.trendone.govtrend.service.ExcelUploadService;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/crud")
public class CrudController {

    private static final String MEMBER_UID_ATTRIBUTE = "mbrUid";

    private final ExcelUploadService excelUploadService;

    public CrudController(ExcelUploadService excelUploadService) {
        this.excelUploadService = excelUploadService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseDto<UploadResponse>> upload(
            @RequestParam(value = "upload_files", required = false) MultipartFile file,
            @RequestParam(value = "preview_sha256", required = false) String previewSha256,
            @RequestParam(value = "preview_fingerprint", required = false) String previewFingerprint,
            @RequestParam(value = "allow_delete_only", defaultValue = "false") boolean allowDeleteOnly,
            HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        String mbrUid = session == null ? null : (String) session.getAttribute(MEMBER_UID_ATTRIBUTE);
        return ResponseEntity.ok(ResponseDto.ok(
                excelUploadService.upload(
                        file, mbrUid, previewSha256, previewFingerprint, allowDeleteOnly)));
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResponseDto<UploadPreviewResponse>> preview(
            @RequestParam(value = "upload_files", required = false) MultipartFile file,
            HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        String mbrUid = session == null ? null : (String) session.getAttribute(MEMBER_UID_ATTRIBUTE);
        return ResponseEntity.ok(ResponseDto.ok(excelUploadService.preview(file, mbrUid)));
    }
}
