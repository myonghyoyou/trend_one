package com.trendone.govtrend.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;

import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.exception.BizException;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class ExcelUploadParserTest {

    private final ExcelUploadParser parser = new ExcelUploadParser();

    @Test
    void parsesDataSheetsAndSkipsRowsWithNoMeasurement() throws Exception {
        MockMultipartFile file = workbookFile(false);

        GovernorUploadData result = parser.parse(file);

        assertEquals(1, result.getSheets().size());
        assertEquals("TUE", result.getSheets().get(0).getInspctDay());
        assertEquals(1, result.getSheets().get(0).getRows().size());
    }

    @Test
    void rejectsDuplicateGovernorTimestampAcrossSheets() throws Exception {
        MockMultipartFile file = workbookFile(true);

        BizException exception = assertThrows(BizException.class, () -> parser.parse(file));

        assertEquals("업로드 파일에 동일 정압기의 동일 시간 데이터가 중복됩니다.", exception.getMessage());
    }

    private MockMultipartFile workbookFile(boolean duplicate) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet reportSheet = workbook.createSheet("REPORT(월)");
            reportSheet.createRow(1).createCell(1).setCellValue("REPORT ONLY");

            Sheet dataSheet = workbook.createSheet("DATA(화)");
            addDataRow(dataSheet, 1, LocalDateTime.of(2026, 7, 6, 0, 10), 2.25D);
            if (duplicate) {
                Row duplicateRow = dataSheet.createRow(3);
                duplicateRow.createCell(0).setCellValue(
                        DateUtil.getExcelDate(LocalDateTime.of(2026, 7, 6, 0, 10)));
                duplicateRow.createCell(1).setCellValue(2.3D);
            }

            workbook.write(outputStream);
            return new MockMultipartFile(
                    "upload_files",
                    "test.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    outputStream.toByteArray());
        }
    }

    private void addDataRow(Sheet sheet, int rowIndex, LocalDateTime time, double value) {
        Row header = sheet.createRow(rowIndex);
        header.createCell(0).setCellValue("날짜 / 정압기명");
        header.createCell(1).setCellValue("서울.상계우방.P2");
        Row row = sheet.createRow(rowIndex + 1);
        row.createCell(0).setCellValue(DateUtil.getExcelDate(time));
        row.createCell(1).setCellValue(value);
    }
}
