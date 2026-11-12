-- Phòng ban và thiết bị thuộc một workspace, để chỉ admin của đúng công ty mới tạo/sửa/đổi QR được.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS workspace_id INT REFERENCES workspaces(workspace_id) ON DELETE CASCADE;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS workspace_id INT REFERENCES workspaces(workspace_id) ON DELETE CASCADE;

-- Dữ liệu cũ: lúc thêm cột chỉ có một công ty, nên gán về workspace cũ nhất; thiết bị theo phòng ban của nó
UPDATE departments SET workspace_id = (SELECT min(workspace_id) FROM workspaces) WHERE workspace_id IS NULL;
UPDATE assets a SET workspace_id = COALESCE(
    (SELECT d.workspace_id FROM departments d WHERE d.department_id = a.department_id),
    (SELECT min(workspace_id) FROM workspaces)
) WHERE workspace_id IS NULL;

-- Không đặt NOT NULL: DB mới có phòng ban mẫu (005) trước khi có workspace. Dòng không có workspace thì không ai quản trị được.
CREATE INDEX IF NOT EXISTS idx_departments_workspace ON departments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_workspace ON assets(workspace_id);
