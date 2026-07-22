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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.dto.upload.GovernorUploadColumn;
import com.trendone.govtrend.dto.upload.GovernorUploadData;
import com.trendone.govtrend.dto.upload.GovernorUploadRow;
import com.trendone.govtrend.dto.upload.GovernorUploadSheet;
import com.trendone.govtrend.exception.BizException;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class ExcelUploadParser {

    private static final int HEADER_ROW_INDEX = 1;
    private static final int DATA_START_ROW_INDEX = 2;
    private static final int MAX_DATA_SHEETS = 7;
    private static final int MAX_GOVERNOR_COLUMNS_PER_SHEET = 500;
    private static final int MAX_ROWS_PER_SHEET = 10000;
    private static final int MAX_UPLOAD_RECORDS = 500000;
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
        days.put("DATA(월)", "MON");
        days.put("DATA(화)", "TUE");
        days.put("DATA(수)", "WED");
        days.put("DATA(목)", "THU");
        days.put("DATA(금)", "FRI");
        days.put("DATA(토)", "SAT");
        days.put("DATA(일)", "SUN");
        INSPECTION_DAY_BY_SHEET = Collections.unmodifiableMap(days);
    }

    public GovernorUploadData parse(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream();
                Workbook workbook = WorkbookFactory.create(inputStream)) {
            List<GovernorUploadSheet> sheets = new ArrayList<>();
            for (Sheet sheet : workbook) {
                if (isDataSheet(sheet.getSheetName())) {
                    if (sheets.size() >= MAX_DATA_SHEETS) {
                        throw invalid("DATA 시트는 최대 7개까지 업로드할 수 있습니다.");
                    }
                    sheets.add(parseSheet(sheet));
                }
            }
            if (sheets.isEmpty()) {
                throw invalid("엑셀 파일에 DATA 시트가 없습니다.");
            }
            validateDuplicateRows(sheets);
            int uploadRecords = sheets.stream()
                    .mapToInt(sheet -> sheet.getColumns().size() * sheet.getRows().size())
                    .sum();
            if (uploadRecords > MAX_UPLOAD_RECORDS) {
                throw invalid("업로드 측정 건수가 너무 많습니다. 파일을 나누어 업로드하세요.");
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
        if (headerRow == null) {
            throw invalid("엑셀 헤더 형식이 올바르지 않습니다.");
        }

        DataFormatter formatter = new DataFormatter();
        List<GovernorUploadColumn> columns = new ArrayList<>();
        short lastCellNum = headerRow.getLastCellNum();
        for (int columnIndex = 1; columnIndex < lastCellNum; columnIndex++) {
            Cell headerCell = headerRow.getCell(columnIndex);
            String header = formatter.formatCellValue(headerCell).trim();
            if (!header.isEmpty()) {
                columns.add(parseHeader(header, sheet.getSheetName(), columnIndex));
            }
        }
        if (columns.size() > MAX_GOVERNOR_COLUMNS_PER_SHEET) {
            throw invalid(String.format("%s 시트의 정압기 열이 너무 많습니다.", sheet.getSheetName()));
        }
        if (columns.isEmpty()) {
            throw invalid(String.format("%s 시트에 정압기 헤더가 없습니다.", sheet.getSheetName()));
        }

        List<GovernorUploadRow> rows = new ArrayList<>();
        if (sheet.getLastRowNum() - DATA_START_ROW_INDEX + 1 > MAX_ROWS_PER_SHEET) {
            throw invalid(String.format("%s 시트의 데이터 행이 너무 많습니다.", sheet.getSheetName()));
        }
        for (int rowIndex = DATA_START_ROW_INDEX; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null || isEmptyMeasurementRow(row, columns, formatter)) {
                continue;
            }

            LocalDateTime recordDttm = parseDate(row.getCell(0), formatter, sheet.getSheetName(), rowIndex);
            List<BigDecimal> press2Values = new ArrayList<>();
            for (GovernorUploadColumn column : columns) {
                press2Values.add(parseMeasurement(
                        row.getCell(column.getColumnIndex()), formatter, sheet.getSheetName(), rowIndex,
                        column.getColumnIndex()));
            }
            rows.add(new GovernorUploadRow(recordDttm, press2Values));
        }

        if (rows.isEmpty()) {
            throw invalid("엑셀 시트에 측정 데이터가 없습니다.");
        }
        rows.sort(Comparator.comparing(GovernorUploadRow::getRecordDttm));
        String inspctDay = INSPECTION_DAY_BY_SHEET.get(sheet.getSheetName());
        if (inspctDay == null) {
            throw invalid(String.format("%s 시트의 점검요일을 확인할 수 없습니다.", sheet.getSheetName()));
        }
        return new GovernorUploadSheet(sheet.getSheetName(), inspctDay, columns, rows);
    }

    private void validateDuplicateRows(List<GovernorUploadSheet> sheets) {
        Map<String, String> inspectionDayByGovernor = new HashMap<>();
        Map<String, Set<LocalDateTime>> timestampsByGovernor = new HashMap<>();
        for (GovernorUploadSheet sheet : sheets) {
            for (GovernorUploadColumn column : sheet.getColumns()) {
                String governorKey = column.getCateCd() + "\u0000" + column.getGvrnrNm();
                String previousDay = inspectionDayByGovernor.putIfAbsent(governorKey, sheet.getInspctDay());
                if (previousDay != null && !previousDay.equals(sheet.getInspctDay())) {
                    throw invalid("업로드 파일에서 동일 정압기의 점검요일이 서로 다릅니다.");
                }
                Set<LocalDateTime> timestamps = timestampsByGovernor.computeIfAbsent(
                        governorKey, ignored -> new HashSet<>());
                for (GovernorUploadRow row : sheet.getRows()) {
                    if (!timestamps.add(row.getRecordDttm())) {
                        throw invalid("업로드 파일에 동일 정압기의 동일 시간 데이터가 중복됩니다.");
                    }
                }
            }
        }
    }

    private GovernorUploadColumn parseHeader(String header, String sheetName, int columnIndex) {
        String[] parts = header.trim().split("\\.", 3);
        if (parts.length < 3 || isBlank(parts[0]) || isBlank(parts[1]) || isBlank(parts[2])) {
            throw invalid(String.format("%s 시트 %d열의 정압기 헤더 형식이 올바르지 않습니다.", sheetName, columnIndex + 1));
        }

        String region = removePunctuation(parts[0]);
        String governorName = removePunctuation(parts[1]) + "." + removePunctuation(parts[2]);
        if (isBlank(governorName) || governorName.length() > 20) {
            throw invalid(String.format("%s 시트 %d열의 정압기명이 올바르지 않습니다.", sheetName, columnIndex + 1));
        }
        return new GovernorUploadColumn(governorName, region.contains("경기") ? "3100" : "1100", columnIndex);
    }

    private boolean isEmptyMeasurementRow(
            Row row, List<GovernorUploadColumn> columns, DataFormatter formatter) {
        for (GovernorUploadColumn column : columns) {
            Cell cell = row.getCell(column.getColumnIndex());
            String value = formatter.formatCellValue(cell).trim();
            if (!value.isEmpty() && !value.contains("*")) {
                return false;
            }
        }
        return true;
    }

    private boolean isDataSheet(String sheetName) {
        return sheetName != null && sheetName.startsWith("DATA(") && sheetName.endsWith(")");
    }

    private LocalDateTime parseDate(Cell cell, DataFormatter formatter, String sheetName, int rowIndex) {
        if (cell == null || formatter.formatCellValue(cell).trim().isEmpty()) {
            throw invalid(String.format("%s 시트 %d행의 시간 데이터가 없습니다.", sheetName, rowIndex + 1));
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            double numericValue = cell.getNumericCellValue();
            if (DateUtil.isValidExcelDate(numericValue)) {
                return DateUtil.getLocalDateTime(numericValue);
            }
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
