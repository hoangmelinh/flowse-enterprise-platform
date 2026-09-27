import con from '../config/connect.js';

export const findNotificationsByUserId = async (user_id, limit = 50, offset = 0) => {
    try {
        const query = `SELECT n.*, u.username as actor_username, u.name as actor_name, u.avatar_url as actor_avatar
                       FROM notifications n 
                       LEFT JOIN users u ON n.actor_id = u.user_id AND u.deleted_at IS NULL
                       WHERE n.user_id = $1 AND n.deleted_at IS NULL
                       ORDER BY n.created_at DESC 
                       LIMIT $2 OFFSET $3`;
        const values = [user_id, limit, offset];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

export const countUnreadNotifications = async (user_id) => {
    try {
        const query = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE AND deleted_at IS NULL`;
        const values = [user_id];
        const result = await con.query(query, values);
        return parseInt(result.rows[0].count);
    } catch (error) {
        throw error;
    }
};

export const markAsRead = async (notification_id, user_id) => {
    try {
        const query = `UPDATE notifications SET is_read = TRUE 
                       WHERE notification_id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *`;
        const values = [notification_id, user_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const markAllAsRead = async (user_id) => {
    try {
        const query = `UPDATE notifications SET is_read = TRUE 
                       WHERE user_id = $1 AND is_read = FALSE AND deleted_at IS NULL RETURNING *`;
        const values = [user_id];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

export const deleteNotificationById = async (notification_id, user_id) => {
    try {
        const query = `UPDATE notifications SET deleted_at = CURRENT_TIMESTAMP WHERE notification_id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *`;
        const values = [notification_id, user_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const createNotification = async (user_id, actor_id, entity_id, entity_type, type, content) => {
    try {
        const query = `INSERT INTO notifications (user_id, actor_id, entity_id, entity_type, type, content) 
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const values = [user_id, actor_id, entity_id, entity_type, type, content];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

/**
 * Tạo thông báo assign cho nhiều người cùng lúc.
 * Bỏ qua nếu notification assign đã tồn tại (không trùng lặp).
 */
export const createAssignNotificationIfNotExists = async (user_id, actor_id, task_id, content) => {
    try {
        const query = `
            INSERT INTO notifications (user_id, actor_id, entity_id, entity_type, type, content)
            SELECT $1, $2, $3, 'task', 'task_assigned', $4
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications
                WHERE user_id = $1 AND entity_id = $3 AND type = 'task_assigned' AND deleted_at IS NULL
            )
            RETURNING *`;
        const values = [user_id, actor_id, task_id, content];
        const result = await con.query(query, values);
        return result.rows[0] || null;
    } catch (error) {
        throw error;
    }
};

/**
 * Lấy danh sách notifications theo loại (assign hoặc deadline) cho user.
 */
export const findNotificationsByTypes = async (user_id, types = [], limit = 50, offset = 0) => {
    try {
        const placeholders = types.map((_, i) => `$${i + 4}`).join(', ');
        const query = `
            SELECT n.*,
                   u.name    AS actor_name,
                   u.avatar_url AS actor_avatar,
                   t.name    AS task_name
            FROM notifications n
            LEFT JOIN users u ON n.actor_id = u.user_id AND u.deleted_at IS NULL
            LEFT JOIN tasks t ON n.entity_type = 'task' AND n.entity_id = t.task_id AND t.deleted_at IS NULL
            WHERE n.user_id = $1
              AND n.deleted_at IS NULL
              AND n.type IN (${placeholders})
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3`;
        const values = [user_id, limit, offset, ...types];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

/**
 * Kiểm tra và tạo thông báo deadline (chỉ tạo 1 lần mỗi task, mỗi ngày).
 * Dùng để cron job hoặc trigger khi user vào trang.
 */
export const createDeadlineNotificationIfNotExists = async (user_id, task_id, task_name, due_date) => {
    try {
        const content = `Task "${task_name}" sắp đến hạn vào ${new Date(due_date).toLocaleDateString('vi-VN')}.`;
        const query = `
            INSERT INTO notifications (user_id, actor_id, entity_id, entity_type, type, content)
            SELECT $1, NULL, $2, 'task', 'task_deadline', $3
            WHERE NOT EXISTS (
                SELECT 1 FROM notifications
                WHERE user_id = $1
                  AND entity_id = $2
                  AND type = 'task_deadline'
                  AND created_at >= CURRENT_DATE
                  AND deleted_at IS NULL
            )
            RETURNING *`;
        const values = [user_id, task_id, content];
        const result = await con.query(query, values);
        return result.rows[0] || null;
    } catch (error) {
        throw error;
    }
};

/**
 * Lấy danh sách task sắp đến hạn trong vòng 24h cho user (chưa hoàn thành).
 */
export const findUpcomingDeadlineTasksForUser = async (user_id) => {
    try {
        const query = `
            SELECT t.task_id, t.name, t.due_date
            FROM tasks t
            JOIN task_assigns ta ON ta.task_id = t.task_id AND ta.user_id = $1 AND ta.deleted_at IS NULL
            LEFT JOIN task_status ts ON ts.status_id = t.status_id
            WHERE t.deleted_at IS NULL
              AND t.is_archived = FALSE
              AND t.due_date IS NOT NULL
              AND t.due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
              AND (ts.is_done_state IS NULL OR ts.is_done_state = FALSE)`;
        const result = await con.query(query, [user_id]);
        return result.rows;
    } catch (error) {
        throw error;
    }
};
