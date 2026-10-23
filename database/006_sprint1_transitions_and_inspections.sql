-- ============================================================================
-- SPRINT 1 MIGRATION: WORKFLOW TRANSITIONS, INCIDENT STATES & INSPECTION SEED
-- File: 006_sprint1_transitions_and_inspections.sql
-- ============================================================================

-- 1. Bổ sung các trạng thái còn thiếu cho INCIDENT_FLOW
DO $$
DECLARE
    v_inc_wf_id INT;
BEGIN
    SELECT workflow_id INTO v_inc_wf_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW';
    
    IF v_inc_wf_id IS NOT NULL THEN
        -- ON_HOLD_PENDING_PARTS (Tạm dừng chờ linh kiện)
        INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
        VALUES (v_inc_wf_id, 'ON_HOLD_PENDING_PARTS', 'Chờ linh kiện (Tạm dừng)', '#F59E0B', FALSE, FALSE, 5)
        ON CONFLICT (workflow_id, code) DO NOTHING;

        -- CANCELLED (Hủy sự cố)
        INSERT INTO workflow_states (workflow_id, code, name, color, is_initial, is_terminal, position)
        VALUES (v_inc_wf_id, 'CANCELLED', 'Đã hủy', '#9CA3AF', FALSE, TRUE, 7)
        ON CONFLICT (workflow_id, code) DO NOTHING;
    END IF;
END $$;

-- 2. Cấu hình các bước chuyển (Workflow Transitions) cho INCIDENT_FLOW
DO $$
DECLARE
    v_wf_id INT;
    v_s_rep INT;
    v_s_tri INT;
    v_s_ass INT;
    v_s_inp INT;
    v_s_hld INT;
    v_s_ver INT;
    v_s_res INT;
    v_s_can INT;
BEGIN
    SELECT workflow_id INTO v_wf_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW';
    
    IF v_wf_id IS NOT NULL THEN
        SELECT state_id INTO v_s_rep FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'REPORTED';
        SELECT state_id INTO v_s_tri FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'TRIAGED';
        SELECT state_id INTO v_s_ass FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'ASSIGNED';
        SELECT state_id INTO v_s_inp FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'IN_PROGRESS';
        SELECT state_id INTO v_s_hld FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'ON_HOLD_PENDING_PARTS';
        SELECT state_id INTO v_s_ver FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'WAITING_VERIFY';
        SELECT state_id INTO v_s_res FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'RESOLVED';
        SELECT state_id INTO v_s_can FROM workflow_states WHERE workflow_id = v_wf_id AND code = 'CANCELLED';

        -- Xóa các transition cũ nếu có để tránh trùng
        DELETE FROM workflow_transitions WHERE workflow_id = v_wf_id;

        -- REPORTED -> ASSIGNED: Quản lý phân công kỹ thuật viên
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
        VALUES (v_wf_id, v_s_rep, v_s_ass, 'Phân công kỹ thuật viên', ARRAY['admin', 'manager']::TEXT[], 'STOP_RESPONSE_SLA');

        -- REPORTED -> CANCELLED: Hủy bỏ sự cố
        IF v_s_can IS NOT NULL THEN
            INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
            VALUES (v_wf_id, v_s_rep, v_s_can, 'Hủy sự cố', ARRAY['admin', 'manager']::TEXT[], 'STOP_SLA');
        END IF;

        -- ASSIGNED -> IN_PROGRESS: Kỹ thuật viên tiếp nhận & bắt đầu làm
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
        VALUES (v_wf_id, v_s_ass, v_s_inp, 'Tiếp nhận & Bắt đầu làm', ARRAY['admin', 'manager', 'member', 'technician']::TEXT[], 'START_RESOLVE_SLA');

        -- IN_PROGRESS -> ON_HOLD_PENDING_PARTS: Tạm dừng chờ linh kiện
        IF v_s_hld IS NOT NULL THEN
            INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
            VALUES (v_wf_id, v_s_inp, v_s_hld, 'Yêu cầu linh kiện (Tạm dừng)', ARRAY['admin', 'manager', 'member', 'technician']::TEXT[], 'PAUSE_SLA');

            -- ON_HOLD_PENDING_PARTS -> IN_PROGRESS: Đã nhận linh kiện, làm tiếp
            INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
            VALUES (v_wf_id, v_s_hld, v_s_inp, 'Tiếp tục xử lý (Đã có vật tư)', ARRAY['admin', 'manager', 'member', 'technician']::TEXT[], 'RESUME_SLA');
        END IF;

        -- IN_PROGRESS -> WAITING_VERIFY: Gửi QA nghiệm thu
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles)
        VALUES (v_wf_id, v_s_inp, v_s_ver, 'Gửi QA nghiệm thu', ARRAY['admin', 'manager', 'member', 'technician']::TEXT[]);

        -- WAITING_VERIFY -> IN_PROGRESS: Nghiệm thu không đạt, yêu cầu sửa lại
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles)
        VALUES (v_wf_id, v_s_ver, v_s_inp, 'Trả lại (Nghiệm thu không đạt)', ARRAY['admin', 'manager', 'qa']::TEXT[]);

        -- WAITING_VERIFY -> RESOLVED: Nghiệm thu đạt, đóng sự cố
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
        VALUES (v_wf_id, v_s_ver, v_s_res, 'Đạt chuẩn & Đóng sự cố', ARRAY['admin', 'manager', 'qa']::TEXT[], 'STOP_SLA');

        -- IN_PROGRESS -> RESOLVED: Quản lý đóng trực tiếp
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
        VALUES (v_wf_id, v_s_inp, v_s_res, 'Xong việc & Đóng sự cố', ARRAY['admin', 'manager']::TEXT[], 'STOP_SLA');
    END IF;
END $$;

-- 3. Cấu hình Workflow Transitions cho TASK_FLOW
DO $$
DECLARE
    v_task_wf_id INT;
    v_s_todo INT;
    v_s_inprog INT;
    v_s_review INT;
    v_s_done INT;
BEGIN
    SELECT workflow_id INTO v_task_wf_id FROM workflow_definitions WHERE code = 'TASK_FLOW';
    
    IF v_task_wf_id IS NOT NULL THEN
        SELECT state_id INTO v_s_todo FROM workflow_states WHERE workflow_id = v_task_wf_id AND code = 'TODO';
        SELECT state_id INTO v_s_inprog FROM workflow_states WHERE workflow_id = v_task_wf_id AND code = 'IN_PROGRESS';
        SELECT state_id INTO v_s_review FROM workflow_states WHERE workflow_id = v_task_wf_id AND code = 'REVIEW';
        SELECT state_id INTO v_s_done FROM workflow_states WHERE workflow_id = v_task_wf_id AND code = 'DONE';

        DELETE FROM workflow_transitions WHERE workflow_id = v_task_wf_id;

        -- TODO -> IN_PROGRESS
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles)
        VALUES (v_task_wf_id, v_s_todo, v_s_inprog, 'Bắt đầu thực hiện', ARRAY['admin', 'manager', 'member']::TEXT[]);

        -- IN_PROGRESS -> REVIEW
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles)
        VALUES (v_task_wf_id, v_s_inprog, v_s_review, 'Gửi đánh giá', ARRAY['admin', 'manager', 'member']::TEXT[]);

        -- REVIEW -> DONE
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles, trigger_action)
        VALUES (v_task_wf_id, v_s_review, v_s_done, 'Duyệt hoàn thành', ARRAY['admin', 'manager']::TEXT[], 'STOP_SLA');

        -- REVIEW -> IN_PROGRESS
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles)
        VALUES (v_task_wf_id, v_s_review, v_s_inprog, 'Yêu cầu sửa lại', ARRAY['admin', 'manager']::TEXT[]);

        -- DONE -> IN_PROGRESS (Mở lại)
        INSERT INTO workflow_transitions (workflow_id, from_state_id, to_state_id, transition_name, allowed_roles)
        VALUES (v_task_wf_id, v_s_done, v_s_inprog, 'Mở lại công việc', ARRAY['admin', 'manager']::TEXT[]);
    END IF;
END $$;

-- 4. Seed Checklist & Checklist Items mẫu cho máy CNC-024
DO $$
DECLARE
    v_asset_id INT;
    v_chk_id INT;
BEGIN
    SELECT asset_id INTO v_asset_id FROM assets WHERE asset_code = 'CNC-024' LIMIT 1;
    
    IF v_asset_id IS NOT NULL THEN
        -- Kiểm tra nếu đã có checklist thì bỏ qua
        IF NOT EXISTS (SELECT 1 FROM checklists WHERE asset_id = v_asset_id) THEN
            INSERT INTO checklists (asset_id, title, description)
            VALUES (v_asset_id, 'Phiếu kiểm tra bảo dưỡng định kỳ đầu ca máy CNC', 'Kiểm tra độ rung, nhiệt độ động cơ và hệ thống bôi trơn trước khi vận hành')
            RETURNING checklist_id INTO v_chk_id;

            INSERT INTO checklist_items (checklist_id, question, require_evidence, fail_severity, position)
            VALUES 
            (v_chk_id, 'Mức áp suất dầu bôi trơn trục chính đạt tiêu chuẩn (4.5 - 5.5 bar)?', TRUE, 'HIGH', 1),
            (v_chk_id, 'Hệ thống làm mát tuần hoàn hoạt động ổn định, không rò rỉ dung dịch?', FALSE, 'MEDIUM', 2),
            (v_chk_id, 'Độ rung và tiếng ồn ổ đỡ trục chính ở mức cho phép khi chạy không tải?', TRUE, 'CRITICAL', 3),
            (v_chk_id, 'Nút dừng khẩn cấp (Emergency Stop) và công tắc an toàn cửa chắn nhạy bén?', FALSE, 'CRITICAL', 4),
            (v_chk_id, 'Vệ sinh khay phoi kim loại và khu vực bàn máy sạch sẽ?', FALSE, 'LOW', 5);
        END IF;
    END IF;
END $$;
