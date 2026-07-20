package com.trendone.govtrend.service;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.dao.FileUploadLogDao;
import com.trendone.govtrend.dto.transaction.TransactionCreateResponse;
import com.trendone.govtrend.dto.upload.FileUploadLog;
import com.trendone.govtrend.dto.upload.GovernorUploadColumn;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.GovernorUploadRow;
import com.trendone.govtrend.dto.upload.GovernorUploadSheet;
import com.trendone.govtrend.dto.upload.UploadResponse;
import com.trendone.govtrend.exception.BizException;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ExcelUploadServiceImpl implements ExcelUploadService {

    private static final int HEADER_ROW_INDEX = 1;
    private static final int DATA_START_ROW_INDEX = 2;
    private static final Map<String, String> INSPECTION_DAY_BY_SHEET;
    private static final List<DateTimeFormatter> DATE_FORMATTERS = Arrays.asList(
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm"));

    static {
        Map<String, String> days = new HashMap<>();
        days.put("월요일", "MON");
        days.put("화요일", "TUE");
        days.put("수요일", "WED");
        days.put("목요일", "THU");
        days.put("금요일", "FRI");
        days.put("토요일", "SAT");
        days.put("일요일", "SUN");
        INSPECTION_DAY_BY_SHEET = Collections.unmodifiableMap(days);
    }

    private final TransactionService transactionService;
    private final UploadTransactionService uploadTransactionService;
    private final FileUploadLogDao fileUploadLogDao;

    public ExcelUploadServiceImpl(
            TransactionService transactionService,
            UploadTransactionService uploadTransactionService,
            FileUploadLogDao fileUploadLogDao) {
        this.transactionService = transactionService;
        this.uploadTransactionService = uploadTransactionService;
        this.fileUploadLogDao = fileUploadLogDao;
    }

    @Override
    public UploadResponse upload(MultipartFile file, String mbrUid) {
        validateFile(file, mbrUid);
        String fileName = file.getOriginalFilename();
        TransactionCreateResponse transaction = transactionService.createPending();

        try {
            GovernorUploadData uploadData = parse(file);
            return uploadTransactionService.processUpload(
                    transaction.getTransactionId(), uploadData, mbrUid, fileName);
        } catch (BizException exception) {
            markFailure(transaction.getTransactionId(), mbrUid, fileName, exception.getMessage());
            throw exception;
        } catch (Exception exception) {
            String message = "파일 업로드에 실패하였습니다.";
            markFailure(transaction.getTransactionId(), mbrUid, fileName, exception.getMessage());
            throw new BizException(ErrorCode.MSG_PROC_FAIL, message);
        }
    }

    private GovernorUploadData parse(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream();
                Workbook workbook = WorkbookFactory.create(inputStream)) {
            List<GovernorUploadSheet> sheets = new ArrayList<>();
            for (Sheet sheet : workbook) {
                sheets.add(parseSheet(sheet));
            }
            if (sheets.isEmpty()) {
                throw invalid("엑셀 파일에 시트가 없습니다.");
            }
            return new GovernorUploadData(sheets);
        } catch (BizException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new BizException(ErrorCode.INPUT_VALUE_INVALID, "엑셀 파일을 읽을 수 없습니다.");
        }
    }

    private GovernorUploadSheet parseSheet(Sheet sheet) {
        Row headerRow = sheet.getRow(HEADER_ROW_INDEX);
        if (headerRow == null || headerRow.getLastCellNum() <= 1) {
            throw invalid("엑셀 헤더 형식이 올바르지 않습니다.");
        }

        DataFormatter formatter = new DataFormatter();
        List<GovernorUploadColumn> columns = new ArrayList<>();
        for (int columnIndex = 1; columnIndex < headerRow.getLastCellNum(); columnIndex++) {
            Cell headerCell = headerRow.getCell(columnIndex);
            columns.add(parseHeader(formatter.formatCellValue(headerCell), sheet.getSheetName(), columnIndex));
        }

        List<GovernorUploadRow> rows = new ArrayList<>();
        for (int rowIndex = DATA_START_ROW_INDEX; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null || isEmptyRow(row, columns.size(), formatter)) {
                continue;
            }

            LocalDateTime recordDttm = parseDate(row.getCell(0), formatter, sheet.getSheetName(), rowIndex);
            List<BigDecimal> press2Values = new ArrayList<>();
            for (int columnIndex = 0; columnIndex < columns.size(); columnIndex++) {
                press2Values.add(parseMeasurement(
                        row.getCell(columnIndex + 1), formatter, sheet.getSheetName(), rowIndex, columnIndex + 1));
            }
            rows.add(new GovernorUploadRow(recordDttm, press2Values));
        }

        if (rows.isEmpty()) {
            throw invalid("엑셀 시트에 측정 데이터가 없습니다.");
        }
        rows.sort(Comparator.comparing(GovernorUploadRow::getRecordDttm));
        String inspctDay = INSPECTION_DAY_BY_SHEET.getOrDefault(sheet.getSheetName(), "MON");
        return new GovernorUploadSheet(inspctDay, columns, rows);
    }

    private GovernorUploadColumn parseHeader(String header, String sheetName, int columnIndex) {
        if (header == null || header.trim().isEmpty()) {
            throw invalid(String.format("%s 시트 %d열의 헤더가 비어 있습니다.", sheetName, columnIndex + 1));
        }
        String[] parts = header.trim().split("\\.", 3);
        if (parts.length < 3 || isBlank(parts[0]) || isBlank(parts[1]) || isBlank(parts[2])) {
            throw invalid(String.format("%s 시트 %d열의 정압기 헤더 형식이 올바르지 않습니다.", sheetName, columnIndex + 1));
        }

        String region = removePunctuation(parts[0]);
        String governorName = removePunctuation(parts[1]) + "." + removePunctuation(parts[2]);
        if (isBlank(governorName) || governorName.length() > 20) {
            throw invalid(String.format("%s 시트 %d열의 정압기명이 올바르지 않습니다.", sheetName, columnIndex + 1));
        }
        return new GovernorUploadColumn(governorName, region.contains("경기") ? "3100" : "1100");
    }

    private boolean isEmptyRow(Row row, int columnCount, DataFormatter formatter) {
        for (int index = 0; index <= columnCount; index++) {
            Cell cell = row.getCell(index);
            if (cell != null && !formatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private LocalDateTime parseDate(Cell cell, DataFormatter formatter, String sheetName, int rowIndex) {
        if (cell == null || formatter.formatCellValue(cell).trim().isEmpty()) {
            throw invalid(String.format("%s 시트 %d행의 시간 데이터가 없습니다.", sheetName, rowIndex + 1));
        }
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue();
        }

        String value = formatter.formatCellValue(cell).trim();
        for (DateTimeFormatter dateFormatter : DATE_FORMATTERS) {
            try {
                return LocalDateTime.parse(value, dateFormatter);
            } catch (DateTimeParseException ignored) {
                // Try the next supported spreadsheet date format.
            }
        }
        throw invalid(String.format("%s 시트 %d행의 시간 데이터가 올바르지 않습니다.", sheetName, rowIndex + 1));
    }

    private BigDecimal parseMeasurement(
            Cell cell, DataFormatter formatter, String sheetName, int rowIndex, int columnIndex) {
        if (cell == null || cell.getCellType() == CellType.BLANK) {
            return null;
        }
        String value = formatter.formatCellValue(cell).trim();
        if (value.isEmpty() || value.contains("*")) {
            return null;
        }
        try {
            return new BigDecimal(value.replace(",", ""));
        } catch (NumberFormatException exception) {
            throw invalid(String.format("%s 시트 %d행 %d열의 측정값이 올바르지 않습니다.",
                    sheetName, rowIndex + 1, columnIndex + 1));
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

    private String removePunctuation(String value) {
        return value.replaceAll("[\\p{Punct}]", "");
    }

    private BizException invalid(String message) {
        return new BizException(ErrorCode.INPUT_VALUE_INVALID, message);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
