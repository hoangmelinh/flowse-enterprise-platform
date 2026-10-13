-- ====================================================================
-- SPRINT 2 MIGRATION: GIAI ĐOẠN 3 - EVIDENCE PROTOCOL & AI VALIDATION
-- ====================================================================

-- 1. Bổ sung các cột lưu trữ bằng chứng nghiệm thu và kết quả thẩm định của AI
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS resolved_evidence_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_evidence_status VARCHAR(20) DEFAULT 'NOT_EVALUATED',
ADD COLUMN IF NOT EXISTS ai_evidence_feedback TEXT,
ADD COLUMN IF NOT EXISTS ai_evidence_score INT DEFAULT 0;

COMMENT ON COLUMN incidents.resolved_evidence_urls IS 'Danh sách URL ảnh hoặc video bằng chứng nghiệm thu thực tế trước khi đóng máy';
COMMENT ON COLUMN incidents.ai_evidence_status IS 'Trạng thái thẩm định của AI: NOT_EVALUATED, VERIFIED, WARNING';
COMMENT ON COLUMN incidents.ai_evidence_feedback IS 'Nhận xét và lý do chi tiết từ AI Copilot';
COMMENT ON COLUMN incidents.ai_evidence_score IS 'Điểm độ tin cậy của AI (0 - 100)';

-- 2. Chỉ mục tối ưu truy vấn các sự cố bị AI gắn cờ cảnh báo (để Quản đốc lọc nhanh)
CREATE INDEX IF NOT EXISTS idx_incidents_ai_evidence_status ON incidents(ai_evidence_status);
