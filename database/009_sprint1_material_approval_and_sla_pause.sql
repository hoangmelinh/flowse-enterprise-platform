-- ==============================================================================
-- Migration 009: Sprint 1 - Material Approval Bridge & SLA Pause/Compensate
-- Dự án: Flowse Enterprise Platform (Flowse 2.0)
-- Tiêu chí: Zero Regression, Additive Schema, Hoàn toàn tương thích dữ liệu cũ
-- ==============================================================================

-- 1. Cho phép trạng thái 'PAUSED' trong bảng sla_instances
ALTER TABLE sla_instances DROP CONSTRAINT IF EXISTS sla_instances_status_check;
ALTER TABLE sla_instances ADD CONSTRAINT sla_instances_status_check 
  CHECK (status::text = ANY (ARRAY['IN_SLA'::character varying, 'AT_RISK'::character varying, 'BREACHED'::character varying, 'COMPLETED'::character varying, 'PAUSED'::character varying]::text[]));

-- 2. Bổ sung cột paused_at để lưu mốc thời gian bắt đầu đóng băng SLA
ALTER TABLE sla_instances ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE;

-- 3. Bổ sung cột khóa ngoại incident_id vào bảng approvals để liên thông trực tiếp
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS incident_id INT REFERENCES incidents(incident_id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_approvals_incident_id ON approvals(incident_id);

-- 4. Bổ sung cột request_note vào approvals để lưu ghi chú đề xuất của KTV (tránh bị decision_note ghi đè)
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS request_note TEXT;
