package com.trendone.govtrend.dao;

import com.trendone.govtrend.dto.upload.FileUploadLog;

public interface FileUploadLogDao {

    void insertUploadLog(FileUploadLog uploadLog);
}
