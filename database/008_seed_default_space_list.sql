DO $$
DECLARE
    v_workspace_id INT;
    v_user_id INT;
    v_space_id INT;
    v_list_id INT;
BEGIN
    SELECT workspace_id INTO v_workspace_id FROM workspaces WHERE deleted_at IS NULL LIMIT 1;
    SELECT user_id INTO v_user_id FROM users WHERE deleted_at IS NULL LIMIT 1;

    IF v_workspace_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        -- 1. Tạo Space nếu chưa có
        INSERT INTO spaces (workspace_id, name, description, color, created_by)
        VALUES (v_workspace_id, 'Phân Xưởng Sản Xuất (Operations)', 'Không gian quản lý thiết bị, checklist và sự cố máy móc', '#3B82F6', v_user_id)
        RETURNING space_id INTO v_space_id;

        -- 2. Tạo Task Status mặc định
        INSERT INTO task_status (space_id, status_name, color, position, is_done_state, is_default)
        VALUES 
            (v_space_id, 'TO DO', '#9CA3AF', 0, false, true),
            (v_space_id, 'IN PROGRESS', '#2563EB', 1, false, false),
            (v_space_id, 'COMPLETE', '#22C55E', 2, true, false);

        -- 3. Gán thành viên
        INSERT INTO space_members (space_id, user_id, role_id)
        VALUES (v_space_id, v_user_id, 1)
        ON CONFLICT DO NOTHING;

        -- 4. Tạo List mặc định cho Sự cố Hiện trường
        INSERT INTO lists (space_id, name, created_by)
        VALUES (v_space_id, 'Sự Cố Máy Móc & Hiện Trường', v_user_id)
        RETURNING list_id INTO v_list_id;

        RAISE NOTICE 'Đã tạo thành công Space ID: % và List ID: %', v_space_id, v_list_id;
    END IF;
END $$;
