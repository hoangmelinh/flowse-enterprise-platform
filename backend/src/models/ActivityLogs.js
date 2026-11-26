import con from '../config/connect.js';

const ACTION_LABEL_SQL = `
  CASE al.action
    WHEN 'created'              THEN 'đã tạo task'
    WHEN 'updated'              THEN 'đã cập nhật task'
    WHEN 'deleted'              THEN 'đã xoá task'
    WHEN 'status_changed'       THEN 'đã đổi trạng thái'
    WHEN 'priority_changed'     THEN 'đã đổi ưu tiên'
    WHEN 'assigned'             THEN 'đã phân công'
    WHEN 'unassigned'           THEN 'đã gỡ phân công'
    WHEN 'commented'            THEN 'đã bình luận'
    WHEN 'attachment_added'     THEN 'đã thêm file đính kèm'
    WHEN 'attachment_removed'   THEN 'đã xoá file đính kèm'
    WHEN 'due_date_changed'     THEN 'đã đổi hạn chót'
    WHEN 'start_date_changed'   THEN 'đã đổi ngày bắt đầu'
    WHEN 'moved'                THEN 'đã di chuyển task'
    WHEN 'archived'             THEN 'đã lưu trữ'
    WHEN 'restored'             THEN 'đã khôi phục'
    WHEN 'timer_started'        THEN 'đã bắt đầu bấm giờ'
    WHEN 'timer_stopped'        THEN 'đã dừng bấm giờ'
    WHEN 'sprint_assigned'      THEN 'đã gán sprint'
    WHEN 'milestone_assigned'   THEN 'đã gán milestone'
    WHEN 'tag_added'            THEN 'đã thêm tag'
    WHEN 'tag_removed'          THEN 'đã xoá tag'
    WHEN 'subtask_added'        THEN 'đã thêm subtask'
    WHEN 'story_points_changed' THEN 'đã đổi story points'
    ELSE al.action
  END AS action_label`;

export const findActivitiesByTaskId = async (task_id, limit = 50, offset = 0) => {
    const query = `
        SELECT
            al.activity_id, al.task_id, al.user_id, al.action, al.old_value, al.new_value, al.created_at,
            ${ACTION_LABEL_SQL},
            -- Task context
            t.name         AS task_name,
            t.priority,
            -- List context
            l.list_id,
            l.name         AS list_name,
            -- Status context
            ts.status_name,
            ts.color       AS status_color,
            -- Actor
            u.username,
            u.name         AS user_name,
            u.avatar_url
        FROM activity_logs al
        JOIN  tasks       t  ON t.task_id   = al.task_id  AND t.deleted_at  IS NULL
        JOIN  lists       l  ON l.list_id   = t.list_id
        LEFT JOIN task_status ts ON ts.status_id = t.status_id
        LEFT JOIN users       u  ON u.user_id    = al.user_id AND u.deleted_at IS NULL
        WHERE al.task_id = $1
        ORDER BY al.created_at DESC
        LIMIT $2 OFFSET $3`;

    const result = await con.query(query, [task_id, limit, offset]);
    return result.rows;
};

export const createActivity = async (task_id, user_id, action, old_value = null, new_value = null) => {
    const query = `
        INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`;

    const result = await con.query(query, [
        task_id,
        user_id,
        action,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
    ]);
    return result.rows[0];
};

export const findActivitiesByUserId = async (user_id, limit = 50, offset = 0) => {
    const query = `
        SELECT
            al.activity_id, al.task_id, al.user_id, al.action, al.old_value, al.new_value, al.created_at,
            ${ACTION_LABEL_SQL},
            -- Task context
            t.name         AS task_name,
            t.priority,
            -- List & Space context
            l.list_id,
            l.name         AS list_name,
            l.space_id,
            -- Status context
            ts.status_name,
            ts.color       AS status_color,
            -- Actor
            u.username,
            u.name         AS user_name,
            u.avatar_url
        FROM activity_logs al
        JOIN  tasks       t  ON t.task_id   = al.task_id  AND t.deleted_at  IS NULL
        JOIN  lists       l  ON l.list_id   = t.list_id
        LEFT JOIN task_status ts ON ts.status_id = t.status_id
        LEFT JOIN users       u  ON u.user_id    = al.user_id AND u.deleted_at IS NULL
        WHERE al.user_id = $1
        ORDER BY al.created_at DESC
        LIMIT $2 OFFSET $3`;

    const result = await con.query(query, [user_id, limit, offset]);
    return result.rows;
};

export const findActivitiesBySpaceId = async (space_id, limit = 50, offset = 0) => {
    const query = `
        SELECT
            al.activity_id, al.task_id, al.user_id, al.action, al.old_value, al.new_value, al.created_at,
            ${ACTION_LABEL_SQL},
            -- Task context
            t.name         AS task_name,
            t.priority,
            -- List context
            l.list_id,
            l.name         AS list_name,
            -- Status context
            ts.status_name,
            ts.color       AS status_color,
            -- Actor
            u.username,
            u.name         AS user_name,
            u.avatar_url
        FROM activity_logs al
        JOIN  tasks       t  ON t.task_id   = al.task_id  AND t.deleted_at  IS NULL
        JOIN  lists       l  ON l.list_id   = t.list_id   AND l.space_id    = $1
        LEFT JOIN task_status ts ON ts.status_id = t.status_id
        LEFT JOIN users       u  ON u.user_id    = al.user_id AND u.deleted_at IS NULL
        ORDER BY al.created_at DESC
        LIMIT $2 OFFSET $3`;

    const result = await con.query(query, [space_id, limit, offset]);
    return result.rows;
};

export const findActivitiesByWorkspaceId = async (
    workspace_id,
    { limit = 80, offset = 0, action = null, workItemType = null, search = null, accessibleDeptIds = null } = {}
) => {
    const values = [Number(workspace_id), Number(limit) || 80, Number(offset) || 0];
    const filters = [];

    if (accessibleDeptIds !== null && Array.isArray(accessibleDeptIds)) {
        if (accessibleDeptIds.length === 0) return [];
        values.push(accessibleDeptIds.map(Number));
        filters.push(`(t.department_id = ANY($${values.length}::int[]) OR ast.department_id = ANY($${values.length}::int[]))`);
    }
    if (action) {
        values.push(action);
        filters.push(`al.action = $${values.length}`);
    }
    if (workItemType) {
        values.push(workItemType);
        filters.push(`COALESCE(t.work_item_type, 'TASK') = $${values.length}`);
    }
    if (search) {
        values.push(`%${search}%`);
        filters.push(`(t.name ILIKE $${values.length} OR u.name ILIKE $${values.length} OR al.action ILIKE $${values.length})`);
    }
    const extraWhere = filters.length > 0 ? `AND ${filters.join(' AND ')}` : '';

    const query = `
        SELECT
            al.activity_id, al.task_id, al.user_id, al.action, al.old_value, al.new_value, al.created_at,
            ${ACTION_LABEL_SQL},
            t.name AS task_name,
            COALESCE(t.work_item_type, 'TASK') AS work_item_type,
            t.priority,
            l.list_id,
            l.name AS list_name,
            sp.space_id,
            sp.name AS space_name,
            u.username,
            u.name AS user_name,
            u.email AS user_email,
            u.avatar_url
        FROM activity_logs al
        JOIN tasks t ON t.task_id = al.task_id AND t.deleted_at IS NULL
        JOIN lists l ON l.list_id = t.list_id
        JOIN spaces sp ON sp.space_id = l.space_id AND sp.workspace_id = $1
        LEFT JOIN incidents inc ON inc.task_id = t.task_id
        LEFT JOIN assets ast ON ast.asset_id = inc.asset_id
        LEFT JOIN users u ON u.user_id = al.user_id
        WHERE 1=1 ${extraWhere}
        ORDER BY al.created_at DESC
        LIMIT $2 OFFSET $3`;

    const result = await con.query(query, values);
    return result.rows;
};
