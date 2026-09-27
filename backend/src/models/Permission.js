import pool from '../config/connect.js';

// ============================================================
// PHẦN 1: CÁC HÀM DÒ NGƯỢC (REVERSE LOOKUP)
// Mục đích: Tìm spaceId từ các entity con (task, list, folder, attachment, 
//           comment, timeLog, sprint, milestone, tag, status)
// ============================================================

/**
 * Tìm space_id dựa vào task_id
 */
export const getSpaceIdByTaskId = async (taskId) => {
    const result = await pool.query(
        `SELECT l.space_id 
         FROM tasks t 
         JOIN lists l ON t.list_id = l.list_id 
         WHERE t.task_id = $1 AND t.deleted_at IS NULL`,
        [taskId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

/**
 * Tìm space_id dựa vào list_id
 */
export const getSpaceIdByListId = async (listId) => {
    const result = await pool.query(
        'SELECT space_id FROM lists WHERE list_id = $1 AND deleted_at IS NULL',
        [listId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

/**
 * Tìm space_id dựa vào folder_id
 */
export const getSpaceIdByFolderId = async (folderId) => {
    const result = await pool.query(
        'SELECT space_id FROM folders WHERE folder_id = $1 AND deleted_at IS NULL',
        [folderId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

/**
 * Tìm space_id dựa vào attachment_id
 * Dò ngược: attachment -> task -> space
 */
export const getSpaceIdByAttachmentId = async (attachmentId) => {
    const result = await pool.query(
        `SELECT l.space_id 
         FROM attachments a
         JOIN tasks t ON a.task_id = t.task_id
         JOIN lists l ON t.list_id = l.list_id
         WHERE a.attachment_id = $1 AND a.deleted_at IS NULL AND t.deleted_at IS NULL`,
        [attachmentId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

/**
 * Tìm space_id dựa vào comment_id
 * Dò ngược: comment -> task -> space
 */
export const getSpaceIdByCommentId = async (commentId) => {
    const result = await pool.query(
        `SELECT l.space_id 
         FROM comments c
         JOIN tasks t ON c.task_id = t.task_id
         JOIN lists l ON t.list_id = l.list_id
         WHERE c.comment_id = $1 AND c.deleted_at IS NULL AND t.deleted_at IS NULL`,
        [commentId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

/**
 * Tìm space_id dựa vào sprint_id
 */
export const getSpaceIdBySprintId = async (sprintId) => {
    const result = await pool.query(
        'SELECT space_id FROM sprints WHERE sprint_id = $1 AND deleted_at IS NULL',
        [sprintId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

/**
 * Tìm space_id dựa vào milestone_id
 */
export const getSpaceIdByMilestoneId = async (milestoneId) => {
    const result = await pool.query(
        'SELECT space_id FROM milestones WHERE milestone_id = $1 AND deleted_at IS NULL',
        [milestoneId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};



/**
 * Tìm space_id dựa vào status_id
 */
export const getSpaceIdByStatusId = async (statusId) => {
    const result = await pool.query(
        'SELECT space_id FROM task_status WHERE status_id = $1',
        [statusId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

/**
 * Tìm space_id dựa vào timeLog_id
 * Dò ngược: time_log -> task -> space
 */
export const getSpaceIdByTimeLogId = async (timeLogId) => {
    const result = await pool.query(
        `SELECT l.space_id
         FROM time_logs tl
         JOIN tasks t ON tl.task_id = t.task_id
         JOIN lists l ON t.list_id = l.list_id
         WHERE tl.time_log_id = $1 AND t.deleted_at IS NULL`,
        [timeLogId]
    );
    return result.rows.length > 0 ? result.rows[0].space_id : null;
};

// ============================================================
// PHẦN 2: CÁC HÀM KIỂM TRA QUYỀN (PERMISSION CHECK)
// Logic: Role -> role_permissions -> permissions
// Không hardcode, hoàn toàn dựa trên Database mapping.
// ============================================================

/**
 * Kiểm tra quyền trực tiếp tại Space (space_members.role_id)
 * Flow: space_members -> role_permissions -> permissions
 */
export const checkSpacePermission = async (spaceId, userId, permissionName) => {
    const result = await pool.query(`
        SELECT 1 
        FROM space_members sm
        JOIN spaces s ON s.space_id = sm.space_id
        LEFT JOIN workspace_members wm
          ON wm.workspace_id = s.workspace_id
         AND wm.user_id = sm.user_id
         AND wm.deleted_at IS NULL
        JOIN role_permissions rp ON COALESCE(sm.role_id, wm.role_id) = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE sm.space_id = $1 
          AND sm.user_id = $2 
          AND p.permission_name = $3
          AND sm.deleted_at IS NULL
    `, [spaceId, userId, permissionName]);
    
    return result.rows.length > 0;
};

/**
 * Kiểm tra quyền kế thừa từ Workspace xuống Space
 * Use case: Admin ở Workspace tự động có quyền trên tất cả Space con
 * Flow: spaces.workspace_id -> workspace_members -> role_permissions -> permissions
 */
export const checkInheritedWorkspacePermission = async (spaceId, userId, permissionName) => {
    const result = await pool.query(`
        SELECT 1
        FROM spaces s
        JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
        JOIN role_permissions rp ON wm.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE s.space_id = $1 
          AND wm.user_id = $2 
          AND p.permission_name = $3
          AND wm.deleted_at IS NULL
          AND s.is_private = FALSE
    `, [spaceId, userId, permissionName]);
    
    return result.rows.length > 0;
};

/**
 * Kiểm tra quyền trực tiếp tại Workspace (workspace_members.role_id)
 * Dùng cho các API thao tác trực tiếp lên Workspace (update, delete, invite...)
 */
export const checkWorkspacePermission = async (workspaceId, userId, permissionName) => {
    const result = await pool.query(`
        SELECT 1
        FROM workspace_members wm
        JOIN role_permissions rp ON wm.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE wm.workspace_id = $1 
          AND wm.user_id = $2 
          AND p.permission_name = $3
          AND wm.deleted_at IS NULL
    `, [workspaceId, userId, permissionName]);
    
    return result.rows.length > 0;
};

/**
 * Lấy danh sách tất cả quyền của user tại một Space cụ thể
 * Trả về mảng permission_name, hữu ích cho frontend render UI dựa trên quyền
 */
export const getUserPermissionsInSpace = async (spaceId, userId) => {
    const result = await pool.query(`
        SELECT DISTINCT p.permission_name
        FROM (
            -- Quyền trực tiếp từ space_members
            SELECT rp.permission_id
            FROM space_members sm
            JOIN spaces s ON s.space_id = sm.space_id
            LEFT JOIN workspace_members wm
              ON wm.workspace_id = s.workspace_id
             AND wm.user_id = sm.user_id
             AND wm.deleted_at IS NULL
            JOIN role_permissions rp ON COALESCE(sm.role_id, wm.role_id) = rp.role_id
            WHERE sm.space_id = $1 AND sm.user_id = $2 AND sm.deleted_at IS NULL

            UNION

            -- Quyền kế thừa từ workspace_members
            SELECT rp.permission_id
            FROM spaces s
            JOIN workspace_members wm ON s.workspace_id = wm.workspace_id
            JOIN role_permissions rp ON wm.role_id = rp.role_id
            WHERE s.space_id = $1
              AND wm.user_id = $2
              AND wm.deleted_at IS NULL
              AND s.is_private = FALSE
        ) AS combined
        JOIN permissions p ON combined.permission_id = p.permission_id
    `, [spaceId, userId]);

    return result.rows.map(row => row.permission_name);
};

/**
 * Lấy danh sách tất cả quyền của user tại Workspace
 */
export const getUserPermissionsInWorkspace = async (workspaceId, userId) => {
    const result = await pool.query(`
        SELECT DISTINCT p.permission_name
        FROM workspace_members wm
        JOIN role_permissions rp ON wm.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.permission_id
        WHERE wm.workspace_id = $1 
          AND wm.user_id = $2 
          AND wm.deleted_at IS NULL
    `, [workspaceId, userId]);

    return result.rows.map(row => row.permission_name);
};
