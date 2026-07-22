package com.trendone.govtrend.service;

import java.util.List;

import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.dao.FileUploadLogDao;
import com.trendone.govtrend.dto.transaction.TransactionCreateResponse;
import com.trendone.govtrend.dto.upload.FileUploadLog;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.UploadResponse;
import com.trendone.govtrend.dto.upload.UploadImpactAnalysis;
import com.trendone.govtrend.dto.upload.UploadPreviewResponse;
import com.trendone.govtrend.exception.BizException;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ExcelUploadServiceImpl implements ExcelUploadService {

    private final TransactionService transactionService;
    private final ExcelUploadAsyncService excelUploadAsyncService;
    private final TransactionProgressService transactionProgressService;
    private final FileUploadLogDao fileUploadLogDao;
    private final ExcelUploadParser excelUploadParser;
    private final UploadImpactAnalyzer uploadImpactAnalyzer;
    private final UploadFileHashService uploadFileHashService;

    public ExcelUploadServiceImpl(
            TransactionService transactionService,
            ExcelUploadAsyncService excelUploadAsyncService,
            TransactionProgressService transactionProgressService,
            FileUploadLogDao fileUploadLogDao,
            ExcelUploadParser excelUploadParser,
            UploadImpactAnalyzer uploadImpactAnalyzer,
            UploadFileHashService uploadFileHashService) {
        this.transactionService = transactionService;
        this.excelUploadAsyncService = excelUploadAsyncService;
        this.transactionProgressService = transactionProgressService;
        this.fileUploadLogDao = fileUploadLogDao;
        this.excelUploadParser = excelUploadParser;
        this.uploadImpactAnalyzer = uploadImpactAnalyzer;
        this.uploadFileHashService = uploadFileHashService;
    }

    @Override
    public UploadResponse upload(MultipartFile file, String mbrUid) {
        return upload(file, mbrUid, null, null);
    }

    @Override
    public UploadPreviewResponse preview(MultipartFile file, String mbrUid) {
        validateFile(file, mbrUid);
        GovernorUploadData uploadData = excelUploadParser.parse(file);
        UploadImpactAnalysis impact = uploadImpactAnalyzer.analyze(uploadData);
        return new UploadPreviewResponse(
                file.getOriginalFilename(),
                file.getSize(),
                uploadFileHashService.sha256(file),
                impact);
    }

    @Override
    public UploadResponse upload(
            MultipartFile file,
            String mbrUid,
            String previewSha256,
            String previewFingerprint) {
        return upload(file, mbrUid, previewSha256, previewFingerprint, false);
    }

    @Override
    public UploadResponse upload(
            MultipartFile file,
            String mbrUid,
            String previewSha256,
            String previewFingerprint,
            boolean allowDeleteOnly) {
        validateFile(file, mbrUid);
        String fileName = file.getOriginalFilename();
        TransactionCreateResponse transaction = transactionService.createPending();
        transactionProgressService.initialize(transaction.getTransactionId(), "업로드 대기 중입니다.");

        try {
            GovernorUploadData uploadData = excelUploadParser.parse(file);
            validatePreview(file, uploadData, previewSha256, previewFingerprint, allowDeleteOnly);
            transactionProgressService.update(
                    transaction.getTransactionId(), 5, "파일 검증이 완료되었습니다.");
            excelUploadAsyncService.process(
                    transaction.getTransactionId(), uploadData, mbrUid, fileName, previewFingerprint);
            return new UploadResponse(transaction.getTransactionId(), "pending");
        } catch (BizException exception) {
            markFailure(transaction.getTransactionId(), mbrUid, fileName, exception.getMessage());
            throw exception;
        } catch (Exception exception) {
            String message = "파일 업로드에 실패하였습니다.";
            markFailure(transaction.getTransactionId(), mbrUid, fileName, exception.getMessage());
            throw new BizException(ErrorCode.MSG_PROC_FAIL, message);
        }
    }

    private void validatePreview(
            MultipartFile file,
            GovernorUploadData uploadData,
            String previewSha256,
            String previewFingerprint,
            boolean allowDeleteOnly) {
        if (isBlank(previewSha256) && isBlank(previewFingerprint)) {
            return;
        }
        if (isBlank(previewSha256) || isBlank(previewFingerprint)) {
            throw invalid("파일 미리보기 정보가 올바르지 않습니다. 다시 미리보기를 실행하세요.");
        }
        String currentSha256 = uploadFileHashService.sha256(file);
        if (!previewSha256.equalsIgnoreCase(currentSha256)) {
            throw invalid("미리보기한 파일과 현재 파일이 다릅니다. 다시 미리보기를 실행하세요.");
        }
        UploadImpactAnalysis currentImpact = uploadImpactAnalyzer.analyze(uploadData);
        if (currentImpact.hasDeleteOnlyRecords() && !allowDeleteOnly) {
            throw invalid("기존 측정 데이터 삭제에 대한 동의가 필요합니다.");
        }
        if (!previewFingerprint.equals(currentImpact.getDatabaseFingerprint())) {
            throw invalid("미리보기 후 데이터가 변경되었습니다. 다시 미리보기를 실행하세요.");
        }
    }

    private void validateFile(MultipartFile file, String mbrUid) {
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.FILE_REQUIRED, "업로드할 엑셀 파일을 선택하세요.");
        }
        if (isBlank(mbrUid)) {
            throw new BizException(ErrorCode.EMPTY_SESSION, ErrorCode.EMPTY_SESSION.getMessage());
        }
        String fileName = file.getOriginalFilename();
        if (fileName == null || !(fileName.toLowerCase().endsWith(".xlsx")
                || fileName.toLowerCase().endsWith(".xls"))) {
            throw invalid("엑셀 파일(.xlsx 또는 .xls)만 업로드할 수 있습니다.");
        }
    }

    private void markFailure(String transactionId, String mbrUid, String fileName, String reason) {
        try {
            transactionService.markFailed(transactionId, reason == null ? "파일 업로드 실패" : reason);
            fileUploadLogDao.insertUploadLog(new FileUploadLog(mbrUid, "N", fileName));
        } catch (Exception ignored) {
            // Preserve the original upload failure if audit persistence also fails.
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private BizException invalid(String message) {
        return new BizException(ErrorCode.INPUT_VALUE_INVALID, message);
    }
}
