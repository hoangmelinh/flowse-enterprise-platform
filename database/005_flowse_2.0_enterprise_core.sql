-- ============================================================================
-- FLOWSE 2.0 ENTERPRISE PLATFORM - CORE EXTENSION MIGRATION
-- File: 005_flowse_2.0_enterprise_core.sql
-- Description: Khởi tạo các bảng mở rộng cho Flowse 2.0 theo chuẩn SRS v1.1
--              bao gồm Departments, Workflow Engine, Approval Center, SLA,
--              Field Operations (Incident & Inspection), Asset & QR Context,
--              và Offline Sync Logs.
-- ============================================================================

-- 1. PHÒNG BAN & PHẠM VI TÀI NGUYÊN (DEPARTMENTS & RESOURCE SCOPE)
CREATE TABLE IF NOT EXISTS departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    manager_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    parent_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(department_id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(50) UNIQUE;

-- 2. ĐỊNH NGHĨA QUY TRÌNH (UNIVERSAL WORKFLOW ENGINE)
CREATE TABLE IF NOT EXISTS workflow_definitions (
    workflow_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'TASK_FLOW', 'INCIDENT_FLOW', 'INSPECTION_FLOW', 'REQUEST_FLOW'
    description TEXT,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_states (
    state_id SERIAL PRIMARY KEY,
    workflow_id INT NOT NULL REFERENCES workflow_definitions(workflow_id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6B7280',
    is_terminal BOOLEAN DEFAULT FALSE,
    is_initial BOOLEAN DEFAULT FALSE,
    position INT DEFAULT 0,
    CONSTRAINT uq_workflow_state_code UNIQUE (workflow_id, code)
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
    transition_id SERIAL PRIMARY KEY,
    workflow_id INT NOT NULL REFERENCES workflow_definitions(workflow_id) ON DELETE CASCADE,
    from_state_id INT NOT NULL REFERENCES workflow_states(state_id) ON DELETE CASCADE,
    to_state_id INT NOT NULL REFERENCES workflow_states(state_id) ON DELETE CASCADE,
    transition_name VARCHAR(100) NOT NULL,
    allowed_roles TEXT[] DEFAULT ARRAY['admin', 'manager']::TEXT[],
    required_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
    requires_approval BOOLEAN DEFAULT FALSE,
    trigger_action VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thêm trường liên kết workflow vào bảng tasks (Universal Work Item)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workflow_id INT REFERENCES workflow_definitions(workflow_id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS current_state_id INT REFERENCES workflow_states(state_id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_item_type VARCHAR(30) DEFAULT 'TASK' CHECK (work_item_type IN ('TASK', 'INCIDENT', 'INSPECTION', 'REQUEST'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department_id INT REFERENCES departments(department_id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- 3. TRUNG TÂM PHÊ DUYỆT (APPROVAL CENTER)
CREATE TABLE IF NOT EXISTS approvals (
    approval_id SERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    approver_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    step_order INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    decision_note TEXT,
    decided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. QUẢN LÝ SLA & ESCALATION (SLA ENGINE)
CREATE TABLE IF NOT EXISTS sla_configs (
    sla_config_id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES workflow_definitions(workflow_id) ON DELETE CASCADE,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    target_response_minutes INT NOT NULL DEFAULT 60,
    target_resolve_minutes INT NOT NULL DEFAULT 240,
    warning_threshold_percent INT DEFAULT 80
);

CREATE TABLE IF NOT EXISTS sla_instances (
    sla_instance_id SERIAL PRIMARY KEY,
    task_id INT NOT NULL REFERENCES tasks(task_id) ON DELETE CASCADE,
    sla_config_id INT REFERENCES sla_configs(sla_config_id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deadline_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'IN_SLA' CHECK (status IN ('IN_SLA', 'AT_RISK', 'BREACHED', 'COMPLETED')),
    warning_sent BOOLEAN DEFAULT FALSE,
    breached_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. QUẢN LÝ TÀI SẢN & NGỮ CẢNH QR (ASSET & QR CONTEXT)
CREATE TABLE IF NOT EXISTS assets (
    asset_id SERIAL PRIMARY KEY,
    asset_code VARCHAR(50) UNIQUE NOT NULL, -- vd: CNC-024
    name VARCHAR(150) NOT NULL,
    location VARCHAR(150),
    department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
    qr_token VARCHAR(100) UNIQUE NOT NULL, -- token ngẫu nhiên mã hóa in trên tem QR
    status VARCHAR(30) DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'MAINTENANCE', 'FAULTY', 'DECOMMISSIONED')),
    specs JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TÁC NGHIỆP HIỆN TRƯỜNG: INCIDENT & INSPECTION CHECKLIST (FIELD OPERATIONS)
CREATE TABLE IF NOT EXISTS incidents (
    incident_id SERIAL PRIMARY KEY,
    task_id INT UNIQUE REFERENCES tasks(task_id) ON DELETE CASCADE,
    asset_id INT REFERENCES assets(asset_id) ON DELETE SET NULL,
    reported_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    symptom TEXT,
    evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    verified_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklists (
    checklist_id SERIAL PRIMARY KEY,
    asset_id INT REFERENCES assets(asset_id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklist_items (
    item_id SERIAL PRIMARY KEY,
    checklist_id INT NOT NULL REFERENCES checklists(checklist_id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    require_evidence BOOLEAN DEFAULT FALSE,
    fail_severity VARCHAR(20) DEFAULT 'MEDIUM',
    position INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inspection_runs (
    run_id SERIAL PRIMARY KEY,
    checklist_id INT REFERENCES checklists(checklist_id) ON DELETE SET NULL,
    task_id INT REFERENCES tasks(task_id) ON DELETE CASCADE,
    inspector_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    overall_status VARCHAR(20) DEFAULT 'IN_PROGRESS' CHECK (overall_status IN ('IN_PROGRESS', 'PASS', 'FAIL')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS inspection_results (
    result_id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES inspection_runs(run_id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES checklist_items(item_id) ON DELETE CASCADE,
    is_passed BOOLEAN NOT NULL,
    note TEXT,
    evidence_url TEXT
);

-- 7. ĐỒNG BỘ NGOẠI TUYẾN MOBILE (OFFLINE-FIRST & SYNC ENGINE)
CREATE TABLE IF NOT EXISTS offline_sync_logs (
    sync_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    idempotency_key VARCHAR(100) UNIQUE NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    base_version INT NOT NULL,
    server_version INT NOT NULL,
    status VARCHAR(20) DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'CONFLICT', 'REJECTED')),
    conflict_detail TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEED DATA CƠ BẢN CHO FLOWSE 2.0
-- ============================================================================

-- Seed Departments
INSERT INTO departments (name, code) VALUES
('Khối Quản Lý & Điều Hành', 'OPS'),
('Phòng Kỹ Thuật & Bảo Trì', 'TECH'),
('Phòng Quản Lý Chất Lượng', 'QA'),
('Phân Xưởng Sản Xuất', 'PROD')
ON CONFLICT (code) DO NOTHING;

-- Seed Workflow Definitions
INSERT INTO workflow_definitions (name, code, description) VALUES
('Quy trình Quản lý Task Dự Án', 'TASK_FLOW', 'Workflow mặc định cho tác vụ công việc văn phòng'),
('Quy trình Xử lý Sự cố Hiện trường', 'INCIDENT_FLOW', 'Workflow xử lý sự cố máy móc thiết bị nhà xưởng'),
('Quy trình Kiểm tra Định kỳ (Inspection)', 'INSPECTION_FLOW', 'Workflow thực hiện checklist kiểm tra thiết bị'),
('Quy trình Đề xuất & Phê duyệt Nội bộ', 'REQUEST_FLOW', 'Workflow đề xuất vật tư/linh kiện cần duyệt cấp quản lý')
ON CONFLICT (code) DO NOTHING;

-- Seed States cho TASK_FLOW
DO $$
DECLARE
    v_task_wf_id INT;
    v_s_todo INT;
    v_s_inprog INT;
    v_s_review INT;
    v_s_done INT;
BEGIN
    SELECT workflow_id INTO v_task_wf_id FROM workflow_definitions WHERE code = 'TASK_FLOW';
    
    INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
    VALUES (v_task_wf_id, 'TODO', 'Cần làm', '#6B7280', TRUE, FALSE, 1)
    ON CONFLICT (workflow_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING state_id INTO v_s_todo;

    INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
    VALUES (v_task_wf_id, 'IN_PROGRESS', 'Đang thực hiện', '#3B82F6', FALSE, FALSE, 2)
    ON CONFLICT (workflow_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING state_id INTO v_s_inprog;

    INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
    VALUES (v_task_wf_id, 'REVIEW', 'Chờ đánh giá', '#F59E0B', FALSE, FALSE, 3)
    ON CONFLICT (workflow_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING state_id INTO v_s_review;

    INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
    VALUES (v_task_wf_id, 'DONE', 'Hoàn thành', '#10B981', FALSE, TRUE, 4)
    ON CONFLICT (workflow_id, code) DO UPDATE SET name = EXCLUDED.name RETURNING state_id INTO v_s_done;
END $$;

-- Seed States cho INCIDENT_FLOW
-- REPORTED -> TRIAGED -> ASSIGNED -> IN_PROGRESS -> WAITING_VERIFY -> RESOLVED
DO $$
DECLARE
    v_inc_wf_id INT;
BEGIN
    SELECT workflow_id INTO v_inc_wf_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW';
    
    INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
    VALUES 
    (v_inc_wf_id, 'REPORTED', 'Mới báo cáo', '#EF4444', TRUE, FALSE, 1),
    (v_inc_wf_id, 'TRIAGED', 'Đã phân loại', '#F97316', FALSE, FALSE, 2),
    (v_inc_wf_id, 'ASSIGNED', 'Đã giao xử lý', '#8B5CF6', FALSE, FALSE, 3),
    (v_inc_wf_id, 'IN_PROGRESS', 'Đang khắc phục', '#3B82F6', FALSE, FALSE, 4),
    (v_inc_wf_id, 'WAITING_VERIFY', 'Chờ QA nghiệm thu', '#F59E0B', FALSE, FALSE, 5),
    (v_inc_wf_id, 'RESOLVED', 'Đã đóng / Xong', '#10B981', FALSE, TRUE, 6)
    ON CONFLICT (workflow_id, code) DO NOTHING;
END $$;

-- Seed Sample Asset for Demo & Testing
INSERT INTO assets (asset_code, name, location, qr_token, status)
VALUES ('CNC-024', 'Máy Phay CNC 5 Trục Số 24', 'Xưởng Cơ Khí Chính Xác - Khu Vực B2', 'QR-ASSET-CNC-024-TOKEN-XYZ999', 'OPERATIONAL')
ON CONFLICT (asset_code) DO NOTHING;
