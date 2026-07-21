package com.trendone.govtrend.service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.format.DateTimeFormatter;
import java.util.List;

import javax.sql.DataSource;

import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.dao.GovernorUploadStageDao;
import com.trendone.govtrend.dto.upload.GovernorUploadStageRow;
import com.trendone.govtrend.exception.BizException;

import org.postgresql.PGConnection;
import org.postgresql.copy.CopyManager;
import org.springframework.jdbc.datasource.DataSourceUtils;
import org.springframework.stereotype.Service;

@Service
public class GovernorUploadStageService {

    private static final DateTimeFormatter STAGE_DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final DataSource dataSource;
    private final GovernorUploadStageDao stageDao;

    public GovernorUploadStageService(DataSource dataSource, GovernorUploadStageDao stageDao) {
        this.dataSource = dataSource;
        this.stageDao = stageDao;
    }

    public long copyRows(String transactionId, List<GovernorUploadStageRow> rows) {
        if (rows.isEmpty()) {
            return 0L;
        }

        byte[] csv = toCsv(transactionId, rows);
        Connection connection = DataSourceUtils.getConnection(dataSource);
        try {
            PGConnection pgConnection = connection.unwrap(PGConnection.class);
            CopyManager copyManager = pgConnection.getCopyAPI();
            return copyManager.copyIn(
                    "COPY t_governor_stat_upload_stage "
                            + "(transaction_id, gvrnr_uid, record_dttm, gvrnr_press2) "
                            + "FROM STDIN WITH (FORMAT csv, NULL '\\N')",
                    new ByteArrayInputStream(csv));
        } catch (SQLException | IOException exception) {
            throw new BizException(ErrorCode.MSG_PROC_FAIL, "업로드 데이터를 임시 저장할 수 없습니다.");
        }
    }

    public int deleteStage(String transactionId) {
        return stageDao.deleteStage(transactionId);
    }

    public int deleteExistingGovernorStats(String transactionId) {
        return stageDao.deleteExistingGovernorStats(transactionId);
    }

    public int insertGovernorStats(String transactionId, String mbrUid) {
        return stageDao.insertGovernorStats(transactionId, mbrUid);
    }

    private byte[] toCsv(String transactionId, List<GovernorUploadStageRow> rows) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            for (GovernorUploadStageRow row : rows) {
                appendCsvValue(output, transactionId);
                output.write(',');
                appendCsvValue(output, row.getGvrnrUid());
                output.write(',');
                appendCsvValue(output, row.getRecordDttm().format(STAGE_DATE_FORMATTER));
                output.write(',');
                if (row.getGvrnrPress2() == null) {
                    output.write("\\N".getBytes(StandardCharsets.UTF_8));
                } else {
                    appendCsvValue(output, row.getGvrnrPress2().toPlainString());
                }
                output.write('\n');
            }
            return output.toByteArray();
        } catch (IOException exception) {
            throw new BizException(ErrorCode.MSG_PROC_FAIL, "업로드 데이터를 변환할 수 없습니다.");
        }
    }

    private void appendCsvValue(ByteArrayOutputStream output, String value) throws IOException {
        String escaped = value.replace("\"", "\"\"");
        output.write('"');
        output.write(escaped.getBytes(StandardCharsets.UTF_8));
        output.write('"');
    }
}
