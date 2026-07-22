package com.trendone.govtrend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.trendone.govtrend.dao.FileUploadLogDao;
import com.trendone.govtrend.dto.transaction.TransactionCreateResponse;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.UploadImpactAnalysis;
import com.trendone.govtrend.service.TransactionService;
import com.trendone.govtrend.exception.BizException;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class ExcelUploadServiceImplTest {

    @Mock
    private TransactionService transactionService;

    @Mock
    private ExcelUploadAsyncService excelUploadAsyncService;

    @Mock
    private TransactionProgressService transactionProgressService;

    @Mock
    private FileUploadLogDao fileUploadLogDao;

    @Mock
    private UploadImpactAnalyzer uploadImpactAnalyzer;

    @Mock
    private UploadFileHashService uploadFileHashService;

    @Spy
    private ExcelUploadParser excelUploadParser;

    @InjectMocks
    private ExcelUploadServiceImpl excelUploadService;

    @BeforeEach
    void setUp() {
        when(transactionService.createPending())
                .thenReturn(new TransactionCreateResponse("transaction-1", "pending"));
    }

    @Test
    void parsesOnlyDataSheetsWithNonEmptyHeadersAndMeasurementRows() throws Exception {
        MockMultipartFile file = workbookFile();

        excelUploadService.upload(file, "admin");

        ArgumentCaptor<GovernorUploadData> uploadDataCaptor = ArgumentCaptor.forClass(GovernorUploadData.class);
        verify(excelUploadAsyncService).process(
                eq("transaction-1"), uploadDataCaptor.capture(), eq("admin"), eq("test.xlsx"), eq(null));

        GovernorUploadData uploadData = uploadDataCaptor.getValue();
        assertEquals(1, uploadData.getSheets().size());
        assertEquals("TUE", uploadData.getSheets().get(0).getInspctDay());
        assertEquals(1, uploadData.getSheets().get(0).getColumns().size());
        assertEquals(1, uploadData.getSheets().get(0).getColumns().get(0).getColumnIndex());
        assertEquals(1, uploadData.getSheets().get(0).getRows().size());
        assertEquals(new BigDecimal("2.25"),
                uploadData.getSheets().get(0).getRows().get(0).getGvrnrPress2Values().get(0));
    }

    @Test
    void rejectsPreviewConfirmationWithoutDeleteOnlyConsent() throws Exception {
        MockMultipartFile file = workbookFile();
        when(uploadFileHashService.sha256(file)).thenReturn("file-hash");
        when(uploadImpactAnalyzer.analyze(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new UploadImpactAnalysis(
                        1, 0, 1, 0, 1, 1, 0, 1, 1, "db-fingerprint", java.util.Collections.emptyList(),
                        java.util.Collections.singletonList("삭제 경고")));

        BizException exception = assertThrows(BizException.class,
                () -> excelUploadService.upload(file, "admin", "file-hash", "db-fingerprint", false));

        assertEquals("기존 측정 데이터 삭제에 대한 동의가 필요합니다.", exception.getMessage());
    }

    private MockMultipartFile workbookFile() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet reportSheet = workbook.createSheet("REPORT(월)");
            reportSheet.createRow(1).createCell(1).setCellValue("REPORT ONLY");

            Sheet dataSheet = workbook.createSheet("DATA(화)");
            Row header = dataSheet.createRow(1);
            header.createCell(0).setCellValue("날짜 / 정압기명");
            header.createCell(1).setCellValue("서울.상계우방.P2");
            header.createCell(3);

            Row validRow = dataSheet.createRow(2);
            validRow.createCell(0).setCellValue(
                    DateUtil.getExcelDate(LocalDateTime.of(2026, 7, 6, 0, 10)));
            validRow.createCell(1).setCellValue(2.25D);

            Row emptyMeasurementRow = dataSheet.createRow(3);
            emptyMeasurementRow.createCell(0).setCellValue(
                    DateUtil.getExcelDate(LocalDateTime.of(2026, 7, 6, 0, 20)));

            workbook.write(outputStream);
            return new MockMultipartFile(
                    "upload_files",
                    "test.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    outputStream.toByteArray());
        }
    }
}
