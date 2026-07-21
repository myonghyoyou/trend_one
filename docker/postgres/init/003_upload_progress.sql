-- Phase 3: 비동기 엑셀 업로드 진행률 저장소
CREATE TABLE IF NOT EXISTS gvrnr_mng_sys_app_transaction_progress (
    transaction_id   UUID PRIMARY KEY
        REFERENCES gvrnr_mng_sys_app_transaction (transaction_id) ON DELETE CASCADE,
    progress_percent SMALLINT NOT NULL DEFAULT 0,
    progress_message VARCHAR(200),
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transaction_progress_percent_check
        CHECK (progress_percent BETWEEN 0 AND 100)
);
