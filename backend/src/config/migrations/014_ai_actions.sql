-- Flowse AI chế độ Work: AI chỉ đề xuất thao tác, người dùng bấm Áp dụng mới ghi vào dữ liệu.
-- Bảng này vừa giữ đề xuất chờ xác nhận, vừa là "Lịch sử thao tác" (màn L10).
CREATE TABLE IF NOT EXISTS ai_actions (
    action_id   SERIAL       PRIMARY KEY,
    user_id     INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_type VARCHAR(20)  NOT NULL CHECK (action_type IN ('CREATE_TASK', 'UPDATE_TASK', 'ASSIGN_TASK', 'DELETE_TASK')),
    args        JSONB        NOT NULL,
    summary     JSONB        NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLYING', 'APPLIED', 'CANCELLED', 'FAILED')),
    result      JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    decided_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ai_actions_user ON ai_actions (user_id, created_at DESC);
-- Chặn Data API của Supabase (anon); backend nối bằng postgres nên không bị ảnh hưởng
ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;
