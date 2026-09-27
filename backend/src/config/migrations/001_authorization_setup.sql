-- =============================================
-- FLOSWISE AUTHORIZATION SYSTEM
-- Migration: 001_authorization_setup.sql
-- Mô tả: Tạo bảng permissions, role_permissions
--         và seed dữ liệu cho 3 roles x 21 quyền.
--         Ghi chú: Đã loại bỏ role GUEST, mọi user khi join workspace sẽ có role MEMBER tối thiểu.
-- =============================================

-- 1. Đảm bảo bảng roles đã có đủ 3 roles
INSERT INTO roles (role_name) VALUES ('admin')    ON CONFLICT (role_name) DO NOTHING;
INSERT INTO roles (role_name) VALUES ('manager')  ON CONFLICT (role_name) DO NOTHING;
INSERT INTO roles (role_name) VALUES ('member')   ON CONFLICT (role_name) DO NOTHING;

-- 2. Tạo bảng permissions (Danh sách 21 quyền)
CREATE TABLE IF NOT EXISTS permissions (
    permission_id   SERIAL PRIMARY KEY,
    permission_name VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    group_name      VARCHAR(30) NOT NULL, -- Nhóm: workspace, space, structure, task, interaction
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tạo bảng pivot role_permissions (Mapping role <-> permission)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id         INTEGER NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id   INTEGER NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Tạo index để tăng tốc query check quyền
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 4. Seed 21 permissions
INSERT INTO permissions (permission_name, description, group_name) VALUES
    -- Nhóm Workspace (4 quyền - Chỉ Admin)
    ('WORKSPACE_UPDATE',        'Cập nhật thông tin workspace',              'workspace'),
    ('WORKSPACE_DELETE',        'Xóa workspace',                             'workspace'),
    ('WORKSPACE_INVITE_MEMBER', 'Mời thành viên vào workspace',              'workspace'),
    ('WORKSPACE_MANAGE_ROLES',  'Quản lý vai trò thành viên trong workspace','workspace'),

    -- Nhóm Space (4 quyền)
    ('SPACE_CREATE',            'Tạo space mới trong workspace',             'space'),
    ('SPACE_DELETE',            'Xóa space',                                 'space'),
    ('SPACE_UPDATE',            'Cập nhật thông tin space',                   'space'),
    ('SPACE_MANAGE_MEMBERS',    'Quản lý thành viên trong space',            'space'),

    -- Nhóm Structure (3 quyền)
    ('FOLDER_MANAGE',           'Tạo, sửa, xóa Folder',                     'structure'),
    ('LIST_MANAGE',             'Tạo, sửa, xóa List',                       'structure'),
    ('SETTING_MANAGE',          'Quản lý cài đặt (status, milestones, sprints...)', 'structure'),

    -- Nhóm Task (5 quyền)
    ('TASK_CREATE',             'Tạo task mới',                              'task'),
    ('TASK_UPDATE',             'Cập nhật task (tên, mô tả, ...)',           'task'),
    ('TASK_DELETE',             'Xóa task',                                  'task'),
    ('TASK_ASSIGN',             'Phân công người thực hiện task',            'task'),
    ('TASK_CHANGE_STATUS',      'Thay đổi trạng thái task',                  'task'),

    -- Nhóm Interaction (5 quyền)
    ('COMMENT_CREATE',          'Tạo bình luận',                             'interaction'),
    ('COMMENT_DELETE_OWN',      'Xóa bình luận của chính mình',              'interaction'),
    ('COMMENT_DELETE_ANY',      'Xóa bình luận của bất kỳ ai',              'interaction'),
    ('TIME_LOG_ADD',            'Ghi nhận thời gian làm việc',               'interaction'),
    ('ATTACHMENT_ADD',          'Thêm file đính kèm',                        'interaction')
ON CONFLICT (permission_name) DO NOTHING;

-- 5. Seed role_permissions mapping
-- ========== ADMIN (Toàn bộ 21/21 quyền) ==========
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========== MANAGER (15/21 quyền) ==========
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'manager'
  AND p.permission_name IN (
    -- Space (quản lý, không tạo/xóa)
    'SPACE_UPDATE', 'SPACE_MANAGE_MEMBERS',
    -- Structure (toàn quyền cấu trúc)
    'FOLDER_MANAGE', 'LIST_MANAGE', 'SETTING_MANAGE',
    -- Task (toàn quyền)
    'TASK_CREATE', 'TASK_UPDATE', 'TASK_DELETE', 'TASK_ASSIGN', 'TASK_CHANGE_STATUS',
    -- Interaction
    'COMMENT_CREATE', 'COMMENT_DELETE_OWN', 'COMMENT_DELETE_ANY',
    'TIME_LOG_ADD', 'ATTACHMENT_ADD'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========== MEMBER (8/21 quyền) ==========
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'member'
  AND p.permission_name IN (
    -- Task (không xóa)
    'TASK_CREATE', 'TASK_UPDATE', 'TASK_CHANGE_STATUS', 'TASK_ASSIGN',
    -- Interaction (không xóa comment người khác)
    'COMMENT_CREATE', 'COMMENT_DELETE_OWN',
    'TIME_LOG_ADD', 'ATTACHMENT_ADD'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;



-- 6. Đảm bảo workspace_members và space_members có cột role_id
-- (Chỉ chạy nếu cột chưa tồn tại - DO $$...$$)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'space_members' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE space_members ADD COLUMN role_id INTEGER REFERENCES roles(role_id);
        -- Mặc định gán tất cả space_members hiện tại role 'member'
        UPDATE space_members SET role_id = (SELECT role_id FROM roles WHERE role_name = 'member');
    END IF;
END $$;
