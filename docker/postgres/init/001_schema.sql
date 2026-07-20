-- Local development schema for TREND_ONE.
-- This file is applied automatically when the PostgreSQL volume is created.

CREATE TABLE IF NOT EXISTS t_mbr (
    mbr_uid          VARCHAR(20) PRIMARY KEY,
    mbr_nm           VARCHAR(20),
    last_login_dttm  TIMESTAMP,
    rgst_dttm        TIMESTAMP,
    rgst_uid         VARCHAR(20),
    updt_dttm        TIMESTAMP,
    updt_uid         VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS t_region_cd (
    lvl      INTEGER NOT NULL,
    up_cd    VARCHAR(10),
    cate_cd  VARCHAR(10) PRIMARY KEY,
    cd_name  VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS t_governor (
    gvrnr_uid   VARCHAR(40) PRIMARY KEY,
    gvrnr_nm    VARCHAR(20) NOT NULL,
    cate_cd     VARCHAR(10) NOT NULL,
    rgst_dttm   TIMESTAMP,
    rgst_uid    VARCHAR(20),
    updt_dttm   TIMESTAMP,
    updt_uid    VARCHAR(20),
    inspct_day  VARCHAR(3)
);

CREATE TABLE IF NOT EXISTS t_governor_stat (
    gvrnr_uid       VARCHAR(40) NOT NULL,
    record_dttm     TIMESTAMP NOT NULL,
    gvrnr_press1    NUMERIC(16, 8),
    gvrnr_press2    NUMERIC(16, 8),
    gvrnr_trnsps1   INTEGER,
    gvrnr_trnsps2   INTEGER,
    rgst_dttm       TIMESTAMP,
    rgst_uid        VARCHAR(20),
    updt_dttm       TIMESTAMP,
    updt_uid        VARCHAR(20),
    PRIMARY KEY (gvrnr_uid, record_dttm)
);

CREATE TABLE IF NOT EXISTS t_file_upload_log (
    log_uid     BIGSERIAL PRIMARY KEY,
    mbr_uid     VARCHAR(20),
    success_yn  CHAR(1) NOT NULL,
    file_name   VARCHAR(100),
    rgst_dttm   TIMESTAMP,
    rgst_uid    VARCHAR(20),
    updt_dttm   TIMESTAMP,
    updt_uid    VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS gvrnr_mng_sys_app_transaction (
    transaction_id  UUID PRIMARY KEY,
    status          VARCHAR(20) NOT NULL,
    data            JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transaction_status_check
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back'))
);

CREATE INDEX IF NOT EXISTS idx_t_governor_cate_cd
    ON t_governor (cate_cd);

CREATE INDEX IF NOT EXISTS idx_t_governor_stat_record_dttm
    ON t_governor_stat (record_dttm);

CREATE INDEX IF NOT EXISTS idx_t_file_upload_log_rgst_dttm
    ON t_file_upload_log (rgst_dttm);

CREATE INDEX IF NOT EXISTS idx_transaction_status_created_at
    ON gvrnr_mng_sys_app_transaction (status, created_at);
