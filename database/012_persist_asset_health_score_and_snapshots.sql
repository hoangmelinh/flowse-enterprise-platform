-- ====================================================================
-- MIGRATION 012: PERSIST ASSET HEALTH SCORE & HEALTH SNAPSHOTS
-- Flowise 2.0 Enterprise Work OS - Digital Health Record (Phase 4 / Stage 1)
-- ====================================================================

-- 1. Bổ sung trường điểm sức khỏe và thời điểm cập nhật cuối vào bảng assets
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
ADD COLUMN IF NOT EXISTS last_health_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Bảng lưu vết lịch sử biến động điểm sức khỏe (Timeline Trend & Audit)
CREATE TABLE IF NOT EXISTS asset_health_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    asset_id INT NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    health_score INT NOT NULL,
    delta INT NOT NULL DEFAULT 0,
    reason VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50) DEFAULT 'INCIDENT_CHANGE', -- 'INCIDENT_REPORTED', 'INCIDENT_TRANSITION', 'INSPECTION_RUN', 'INIT'
    metadata JSONB DEFAULT '{}'::JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_health_snapshots_asset_time 
ON asset_health_snapshots (asset_id, recorded_at DESC);
