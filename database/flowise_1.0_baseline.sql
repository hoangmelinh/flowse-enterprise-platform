-- ================================================================
-- FLOWISE — PostgreSQL Database Schema
-- Phiên bản: 3.4 (Đã hợp nhất migrations 001-003)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- 1. USERS & ROLES
-- ================================================================
CREATE TABLE users (
    user_id       SERIAL       PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE,
    name          VARCHAR(255),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_url    TEXT,
    sdt           VARCHAR(20),
    google_id     VARCHAR(255) UNIQUE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    last_seen_at  TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP    DEFAULT NULL
);

CREATE TABLE roles (
    role_id   SERIAL       PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE permissions (
    permission_id   SERIAL      PRIMARY KEY,
    permission_name VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    group_name      VARCHAR(30) NOT NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id       INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_sessions (
    session_id    SERIAL    PRIMARY KEY,
    user_id       INT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    refresh_token TEXT      NOT NULL UNIQUE,
    device_info   TEXT,
    ip_address    INET,
    expires_at    TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 2. WORKSPACES
-- ================================================================
CREATE TABLE workspaces (
    workspace_id SERIAL       PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    slug         VARCHAR(100) NOT NULL UNIQUE,
    description  TEXT,
    plan         VARCHAR(20)  NOT NULL DEFAULT 'free',
    created_by   INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP    DEFAULT NULL
);

CREATE TABLE workspace_members (
    workspace_id INT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE RESTRICT,
    user_id      INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id      INT REFERENCES roles(role_id) ON DELETE SET NULL,
    joined_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP DEFAULT NULL,
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE workspace_invitations (
    invitation_id SERIAL       PRIMARY KEY,
    workspace_id  INT          NOT NULL REFERENCES workspaces(workspace_id) ON DELETE RESTRICT,
    email         VARCHAR(255) NOT NULL,
    role_id       INT          REFERENCES roles(role_id) ON DELETE SET NULL,
    token         TEXT         NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    invited_by    INT          REFERENCES users(user_id) ON DELETE SET NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
    expires_at    TIMESTAMP    NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    accepted_at   TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 3. SPACES
-- ================================================================
CREATE TABLE spaces (
    space_id     SERIAL       PRIMARY KEY,
    workspace_id INT          NOT NULL REFERENCES workspaces(workspace_id) ON DELETE RESTRICT,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    color        VARCHAR(7)   NOT NULL DEFAULT '#6C63FF',
    icon         VARCHAR(10),
    is_private   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by   INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP    DEFAULT NULL
);

CREATE TABLE space_members (
    space_id   INT NOT NULL REFERENCES spaces(space_id) ON DELETE RESTRICT,
    user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id    INT REFERENCES roles(role_id) ON DELETE SET NULL,
    joined_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    PRIMARY KEY (space_id, user_id)
);

CREATE TABLE folders (
    folder_id    SERIAL       PRIMARY KEY,
    space_id     INT          NOT NULL REFERENCES spaces(space_id) ON DELETE RESTRICT,
    name         VARCHAR(255) NOT NULL,
    position     INT          NOT NULL DEFAULT 0,
    created_by   INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP    DEFAULT NULL
);

CREATE TABLE lists (
    list_id      SERIAL       PRIMARY KEY,
    folder_id    INT          REFERENCES folders(folder_id) ON DELETE RESTRICT,
    space_id     INT          NOT NULL REFERENCES spaces(space_id) ON DELETE RESTRICT,
    name         VARCHAR(255) NOT NULL,
    position     INT          NOT NULL DEFAULT 0,
    created_by   INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP    DEFAULT NULL
);

-- ================================================================
-- 4. SPACE ATTRIBUTES
-- ================================================================
CREATE TABLE task_status (
    status_id     SERIAL       PRIMARY KEY,
    space_id      INT          NOT NULL REFERENCES spaces(space_id) ON DELETE RESTRICT,
    status_name   VARCHAR(100) NOT NULL,
    color         VARCHAR(7)   NOT NULL DEFAULT '#9CA3AF',
    position      INT          NOT NULL DEFAULT 0,
    is_done_state BOOLEAN      NOT NULL DEFAULT FALSE,
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE,
    UNIQUE (space_id, status_name)
);

CREATE TABLE milestones (
    milestone_id SERIAL       PRIMARY KEY,
    space_id     INT          NOT NULL REFERENCES spaces(space_id) ON DELETE RESTRICT,
    list_id      INT          REFERENCES lists(list_id) ON DELETE RESTRICT,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track','at_risk','completed','cancelled')),
    color        VARCHAR(7)   DEFAULT '#00D4AA',
    due_date     TIMESTAMP,   
    created_by   INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP    DEFAULT NULL
);

CREATE TABLE sprints (
    sprint_id   SERIAL       PRIMARY KEY,
    space_id    INT          NOT NULL REFERENCES spaces(space_id) ON DELETE RESTRICT,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    goal        TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','completed','cancelled')),
    velocity    SMALLINT,
    start_date  TIMESTAMP,   
    end_date    TIMESTAMP,   
    created_by  INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP    DEFAULT NULL
);



-- ================================================================
-- 5. TASKS & RELATIONS
-- ================================================================
CREATE TABLE tasks (
    task_id        SERIAL       PRIMARY KEY,
    list_id        INT          NOT NULL REFERENCES lists(list_id) ON DELETE RESTRICT, 
    sprint_id      INT          REFERENCES sprints(sprint_id) ON DELETE SET NULL,
    milestone_id   INT          REFERENCES milestones(milestone_id) ON DELETE SET NULL,
    status_id      INT          REFERENCES task_status(status_id) ON DELETE SET NULL,
    
    -- Priority đã được chuyển thành VARCHAR cố định
    priority       VARCHAR(20)  NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent', 'High', 'Normal', 'Low', 'Clear')),
    
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    story_points   SMALLINT     CHECK (story_points >= 0 AND story_points <= 100),
    start_date     TIMESTAMP,   
    due_date       TIMESTAMP,   
    completed_at   TIMESTAMP,
    position       INT          NOT NULL DEFAULT 0,
    is_archived    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by     INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP    DEFAULT NULL
);

CREATE TABLE task_assigns (
    task_id     INT NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    user_id     INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    assigned_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP DEFAULT NULL,
    PRIMARY KEY (task_id, user_id)
);



CREATE TABLE time_logs (
    time_log_id   SERIAL    PRIMARY KEY,
    task_id       INT       NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    user_id       INT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    started_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stopped_at    TIMESTAMP,
    duration_secs INT GENERATED ALWAYS AS (
        CASE WHEN stopped_at IS NOT NULL THEN EXTRACT(EPOCH FROM (stopped_at - started_at))::INT ELSE NULL END
    ) STORED,
    note          TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 6. ACTIVITIES, COMMENTS, NOTIFICATIONS
-- ================================================================
CREATE TABLE activity_logs (
    activity_id SERIAL PRIMARY KEY,
    task_id     INT NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    user_id     INT REFERENCES users(user_id) ON DELETE SET NULL,
    action      VARCHAR(50) NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    comment_id SERIAL    PRIMARY KEY,
    task_id    INT       NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    user_id    INT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content    TEXT      NOT NULL,
    is_edited  BOOLEAN   NOT NULL DEFAULT FALSE,
    edited_at  TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE attachments (
    attachment_id SERIAL       PRIMARY KEY,
    task_id       INT          NOT NULL REFERENCES tasks(task_id) ON DELETE RESTRICT,
    file_name     VARCHAR(255) NOT NULL,
    file_url      TEXT         NOT NULL,
    file_size     BIGINT,
    mime_type     VARCHAR(100),
    uploaded_by   INT          REFERENCES users(user_id) ON DELETE SET NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP    DEFAULT NULL
);

CREATE TABLE notifications (
    notification_id SERIAL       PRIMARY KEY,
    user_id         INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    actor_id        INT          REFERENCES users(user_id) ON DELETE SET NULL,
    entity_id       INT,
    entity_type     VARCHAR(50),
    type            VARCHAR(100) NOT NULL,
    content         TEXT         NOT NULL,
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP    DEFAULT NULL
);

-- ================================================================
-- 7. MESSAGING
-- ================================================================
CREATE TABLE conversations (
    conversation_id SERIAL      PRIMARY KEY,
    workspace_id    INT         NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL DEFAULT 'DIRECT'
                                CHECK (type IN ('DIRECT', 'CHANNEL', 'SPACE')),
    name            VARCHAR(100),
    space_id        INT         REFERENCES spaces(space_id) ON DELETE CASCADE,
    created_by      INT         REFERENCES users(user_id) ON DELETE SET NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_members (
    conversation_id INT       NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    user_id         INT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    message_id      SERIAL       PRIMARY KEY,
    conversation_id INT          NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_id       INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content         TEXT         NOT NULL DEFAULT '',
    file_url        TEXT,
    file_name       TEXT,
    file_type       VARCHAR(100),
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- 8. INDEXES
-- ================================================================
CREATE INDEX idx_role_permissions_role_id       ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE INDEX idx_tasks_list_id       ON tasks(list_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status_id     ON tasks(status_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_archived      ON tasks(is_archived) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_position      ON tasks(list_id, status_id, position) WHERE deleted_at IS NULL;
CREATE INDEX idx_milestones_list_id  ON milestones(list_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_comments_task_id    ON comments(task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_user  ON notifications(user_id, is_read) WHERE deleted_at IS NULL;

CREATE INDEX idx_folders_space_id ON folders(space_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lists_folder_id  ON lists(folder_id)  WHERE deleted_at IS NULL;
CREATE INDEX idx_lists_space_id   ON lists(space_id)   WHERE deleted_at IS NULL;

CREATE INDEX idx_spaces_workspace_id ON spaces(workspace_id) WHERE deleted_at IS NULL;

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conv_members_user      ON conversation_members(user_id);


-- ================================================================
-- 9. TRIGGERS
-- ================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$;

CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION set_task_completed_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_is_done BOOLEAN;
BEGIN
    IF NEW.status_id IS DISTINCT FROM OLD.status_id THEN
        SELECT is_done_state INTO v_is_done FROM task_status WHERE status_id = NEW.status_id;
        IF v_is_done = TRUE THEN NEW.completed_at = CURRENT_TIMESTAMP; ELSE NEW.completed_at = NULL; END IF;
    END IF; RETURN NEW;
END; $$;
CREATE TRIGGER trg_task_completed_at BEFORE UPDATE OF status_id ON tasks FOR EACH ROW EXECUTE FUNCTION set_task_completed_at();


CREATE OR REPLACE FUNCTION soft_delete_space_cascade() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE tasks SET deleted_at = NEW.deleted_at, updated_at = CURRENT_TIMESTAMP 
        WHERE list_id IN (SELECT list_id FROM lists WHERE space_id = NEW.space_id) AND deleted_at IS NULL;
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
        UPDATE tasks SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP 
        WHERE list_id IN (SELECT list_id FROM lists WHERE space_id = NEW.space_id) AND deleted_at = OLD.deleted_at;
    END IF; RETURN NEW;
END; $$;
CREATE TRIGGER trg_spaces_soft_delete_cascade AFTER UPDATE OF deleted_at ON spaces FOR EACH ROW EXECUTE FUNCTION soft_delete_space_cascade();

CREATE OR REPLACE FUNCTION soft_delete_task_cascade() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        UPDATE comments SET deleted_at = NEW.deleted_at, updated_at = CURRENT_TIMESTAMP WHERE task_id = NEW.task_id AND deleted_at IS NULL;
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
        UPDATE comments SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE task_id = NEW.task_id AND deleted_at = OLD.deleted_at;
    END IF; RETURN NEW;
END; $$;
CREATE TRIGGER trg_tasks_soft_delete_cascade AFTER UPDATE OF deleted_at ON tasks FOR EACH ROW EXECUTE FUNCTION soft_delete_task_cascade();

-- ================================================================
-- 10. VIEWS
-- ================================================================
CREATE OR REPLACE VIEW kanban_tasks
WITH (security_invoker = true) AS
SELECT
    t.task_id, l.space_id, l.folder_id, t.list_id, t.name, t.description, t.story_points,
    t.start_date, t.due_date, t.completed_at, t.position, t.is_archived, t.created_by, t.created_at, t.updated_at,
    ts.status_name, ts.color AS status_color, ts.is_done_state, 
    
    t.priority AS priority_name, 
    CASE t.priority
        WHEN 'Urgent' THEN '#ef4444' 
        WHEN 'High'   THEN '#f59e0b' 
        WHEN 'Normal' THEN '#3b82f6' 
        WHEN 'Low'    THEN '#8b5cf6' 
        WHEN 'Clear'  THEN '#9ca3af' 
        ELSE 'transparent'
    END AS priority_color,
    
    sp.name AS sprint_name, ms.name AS milestone_name,
    0 AS subtask_count, 0 AS subtask_done_count,
    COALESCE(cmt.cnt, 0) AS comment_count, COALESCE(att.cnt, 0) AS attachment_count, COALESCE(tl.total_secs, 0) AS time_logged_secs
FROM tasks t
JOIN lists l ON t.list_id = l.list_id
LEFT JOIN task_status ts ON ts.status_id = t.status_id
LEFT JOIN sprints sp ON sp.sprint_id = t.sprint_id
LEFT JOIN milestones ms ON ms.milestone_id = t.milestone_id
LEFT JOIN LATERAL (SELECT COUNT(*) AS cnt FROM comments WHERE task_id = t.task_id AND deleted_at IS NULL) cmt ON TRUE
LEFT JOIN LATERAL (SELECT COUNT(*) AS cnt FROM attachments WHERE task_id = t.task_id AND deleted_at IS NULL) att ON TRUE
LEFT JOIN LATERAL (SELECT COALESCE(SUM(duration_secs), 0) AS total_secs FROM time_logs WHERE task_id = t.task_id AND stopped_at IS NOT NULL) tl ON TRUE
WHERE t.is_archived = FALSE AND t.deleted_at IS NULL;

CREATE OR REPLACE VIEW user_task_summary
WITH (security_invoker = true) AS
SELECT
    ta.user_id, l.space_id,
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE ts.is_done_state = TRUE) AS done_tasks,
    COUNT(*) FILTER (WHERE t.due_date < CURRENT_TIMESTAMP AND ts.is_done_state = FALSE) AS overdue_tasks,
    COALESCE(SUM(tl.total_secs), 0) AS total_time_secs
FROM task_assigns ta
JOIN tasks t ON t.task_id = ta.task_id
JOIN lists l ON t.list_id = l.list_id
JOIN task_status ts ON ts.status_id = t.status_id
LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(duration_secs), 0) AS total_secs FROM time_logs WHERE task_id = t.task_id AND stopped_at IS NOT NULL
) tl ON TRUE
WHERE t.is_archived = FALSE AND t.deleted_at IS NULL AND ta.deleted_at IS NULL
GROUP BY ta.user_id, l.space_id;


-- =================================================================
-- FLOSWISE - SEEDING ROLES & PERMISSIONS (CLEAN VERSION)
-- =================================================================

-- 1. Thêm Roles
INSERT INTO roles (role_name) VALUES
('admin'),
('manager'),
('member')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Thêm Permissions
INSERT INTO permissions (permission_name, description, group_name) VALUES
-- Workspace
('WORKSPACE_UPDATE', 'Cap nhat thong tin workspace', 'workspace'),
('WORKSPACE_DELETE', 'Xoa workspace', 'workspace'),
('WORKSPACE_INVITE_MEMBER', 'Moi thanh vien vao workspace', 'workspace'),
('WORKSPACE_MANAGE_ROLES', 'Quan ly vai tro thanh vien trong workspace', 'workspace'),

-- Space & Structure
('SPACE_CREATE', 'Tao space moi trong workspace', 'space'),
('SPACE_UPDATE', 'Cap nhat thong tin space', 'space'),
('SPACE_DELETE', 'Xoa space', 'space'),
('SPACE_MANAGE_MEMBERS', 'Quan ly thanh vien trong space', 'space'),
('FOLDER_MANAGE', 'Tao, sua, xoa folder', 'structure'),
('LIST_MANAGE', 'Tao, sua, xoa list', 'structure'),
('SETTING_MANAGE', 'Quan ly status, milestone va sprint', 'structure'),

-- Task
('TASK_CREATE', 'Tao task moi', 'task'),
('TASK_UPDATE', 'Cap nhat task', 'task'),
('TASK_DELETE', 'Xoa task', 'task'),
('TASK_CHANGE_STATUS', 'Thay doi trang thai task', 'task'),
('TASK_ASSIGN', 'Phan cong nguoi thuc hien task', 'task'),

-- Interaction
('COMMENT_CREATE', 'Tao binh luan', 'interaction'),
('COMMENT_DELETE_OWN', 'Xoa binh luan cua chinh minh', 'interaction'),
('COMMENT_DELETE_ANY', 'Xoa binh luan cua bat ky ai', 'interaction'),
('TIME_LOG_ADD', 'Ghi nhan thoi gian lam viec', 'interaction'),
('ATTACHMENT_ADD', 'Them file dinh kem', 'interaction')
ON CONFLICT (permission_name) DO NOTHING;

-- 3. Mapping: Role_Permissions
-- Xóa data cũ để map lại từ đầu (đảm bảo sạch sẽ khi chạy seed nhiều lần)
TRUNCATE TABLE role_permissions CASCADE;

INSERT INTO role_permissions (role_id, permission_id) VALUES
-- ==========================================
-- ADMIN (Role 1): Co TAT CA cac quyen (1 den 21)
-- ==========================================
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8), (1, 9), (1, 10), 
(1, 11), (1, 12), (1, 13), (1, 14), (1, 15), (1, 16), (1, 17), (1, 18), (1, 19), (1, 20), (1, 21),

-- ==========================================
-- MANAGER (Role 2): Quan ly Space & Task (Khong duoc xoa Workspace, khong doi role he thong)
-- ==========================================
(2, 6), (2, 8), (2, 9), (2, 10), (2, 11), 
(2, 12), (2, 13), (2, 14), (2, 15), (2, 16), 
(2, 17), (2, 18), (2, 19), (2, 20), (2, 21), 

-- ==========================================
-- MEMBER (Role 3): Lam viec binh thuong
-- Ghi chu: MEMBER co du cac quyen tuong tac co ban (tao/sua task, comment, time log, attachment)
-- Quyen TASK_DELETE va quan ly cau truc (LIST, FOLDER, SPRINT, MILESTONE, STATUS) thuoc MANAGER tro len
-- ==========================================
(3, 12), (3, 13), (3, 15), (3, 16), 
(3, 17), (3, 18), (3, 20), (3, 21);
