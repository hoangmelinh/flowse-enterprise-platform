-- Migration 010: Bổ sung theo dõi Downtime và chỉ số MTTR cho sự cố thiết bị (Giai đoạn 2)

-- 1. Bổ sung các trường resolved_at và downtime_minutes vào bảng incidents
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS downtime_minutes INT DEFAULT 0;

-- 2. Chỉ mục tối ưu hóa hiệu năng truy vấn báo cáo và tính toán MTTR
CREATE INDEX IF NOT EXISTS idx_incidents_resolved_at ON incidents(resolved_at);
CREATE INDEX IF NOT EXISTS idx_incidents_asset_resolved ON incidents(asset_id, resolved_at);

-- 3. Cập nhật hồi tố (Backfill) dữ liệu cho các sự cố đã hoàn tất trước đó nếu có
UPDATE incidents inc
SET resolved_at = t.updated_at,
    downtime_minutes = GREATEST(1, ROUND(EXTRACT(EPOCH FROM (t.updated_at - inc.created_at)) / 60))
FROM tasks t
JOIN workflow_states ws ON t.current_state_id = ws.state_id
WHERE inc.task_id = t.task_id
  AND ws.code IN ('RESOLVED', 'CLOSED')
  AND inc.resolved_at IS NULL;
