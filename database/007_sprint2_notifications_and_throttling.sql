-- ================================================================
-- MIGRATION 007: SPRINT 2 - NOTIFICATIONS, ANTI-SPAM THROTTLING & VERIFICATION
-- Flowse Enterprise Platform (Flowse 2.0)
-- ================================================================

-- 1. Bổ sung các cột phục vụ phân loại và chống spam cho bảng notifications
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL',
    ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(255),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- Tạo index cho dedup_key và priority để truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- 2. Bảng quản lý cửa sổ Throttling (Anti-Spam) chống bắn tin lặp lại
CREATE TABLE IF NOT EXISTS notification_throttles (
    throttle_key VARCHAR(255) PRIMARY KEY,
    last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_count INT NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_throttles_last_sent ON notification_throttles(last_sent_at);

-- 3. Bổ sung trạng thái xác thực tài khoản email cho người dùng
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP;

-- 4. Bổ sung các cấu hình ngưỡng cảnh báo SLA mặc định cho INCIDENT_FLOW (workflow_id = 2)
INSERT INTO sla_configs (workflow_id, severity, target_response_minutes, target_resolve_minutes, warning_threshold_percent)
SELECT 2, 'CRITICAL', 15, 120, 75
WHERE NOT EXISTS (SELECT 1 FROM sla_configs WHERE workflow_id = 2 AND severity = 'CRITICAL');

INSERT INTO sla_configs (workflow_id, severity, target_response_minutes, target_resolve_minutes, warning_threshold_percent)
SELECT 2, 'HIGH', 30, 240, 80
WHERE NOT EXISTS (SELECT 1 FROM sla_configs WHERE workflow_id = 2 AND severity = 'HIGH');

INSERT INTO sla_configs (workflow_id, severity, target_response_minutes, target_resolve_minutes, warning_threshold_percent)
SELECT 2, 'MEDIUM', 60, 480, 80
WHERE NOT EXISTS (SELECT 1 FROM sla_configs WHERE workflow_id = 2 AND severity = 'MEDIUM');

INSERT INTO sla_configs (workflow_id, severity, target_response_minutes, target_resolve_minutes, warning_threshold_percent)
SELECT 2, 'LOW', 120, 1440, 90
WHERE NOT EXISTS (SELECT 1 FROM sla_configs WHERE workflow_id = 2 AND severity = 'LOW');
