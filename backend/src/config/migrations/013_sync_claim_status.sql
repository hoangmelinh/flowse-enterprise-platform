-- Việc 6: sync giữ chỗ idempotency_key trước khi thực hiện (trạng thái PROCESSING), tránh hai request song song cùng áp dụng.
ALTER TABLE offline_sync_logs DROP CONSTRAINT IF EXISTS offline_sync_logs_status_check;
ALTER TABLE offline_sync_logs ADD CONSTRAINT offline_sync_logs_status_check
  CHECK (status IN ('PROCESSING', 'APPLIED', 'CONFLICT', 'REJECTED'));
