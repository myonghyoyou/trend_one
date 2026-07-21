-- Staging rows used by the bulk Excel upload path.
CREATE TABLE IF NOT EXISTS t_governor_stat_upload_stage (
    transaction_id  UUID NOT NULL,
    gvrnr_uid       VARCHAR(40) NOT NULL,
    record_dttm     TIMESTAMP NOT NULL,
    gvrnr_press2   NUMERIC(16, 8),
    PRIMARY KEY (transaction_id, gvrnr_uid, record_dttm)
);

CREATE INDEX IF NOT EXISTS idx_governor_stat_upload_stage_transaction
    ON t_governor_stat_upload_stage (transaction_id);
