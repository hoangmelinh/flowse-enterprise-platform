import con from '../config/connect.js';

export const findStatusesByListId = async (list_id) => {
    try {
        const query = `
            SELECT ts.* FROM task_status ts
            JOIN lists l ON ts.space_id = l.space_id
            WHERE l.list_id = $1 AND l.deleted_at IS NULL
            ORDER BY ts.position ASC;
        `;

        const values = [list_id];

        const result = await con.query(query, values);

        return result.rows;

    } catch (error) {
        throw error;
    }
};

export const findStatusesBySpaceId = async (space_id) => {
    try {
        const query = `
            SELECT * FROM task_status
            WHERE space_id = $1
            ORDER BY position ASC;
        `;
        const values = [space_id];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};
export const findStatusesBySprintId = async (sprint_id) => {
    try {
        const query = `
            SELECT ts.* FROM task_status ts
            JOIN sprints s ON ts.space_id = s.space_id
            WHERE s.sprint_id = $1 AND s.deleted_at IS NULL
            ORDER BY ts.position ASC;
        `;
        const values = [sprint_id];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};
export const findStatusById = async (status_id) => {
    try {
        const query = `SELECT * FROM task_status WHERE status_id = $1`;
        const values = [status_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const createStatus = async (space_id, status_name, color, position, is_done_state = false, is_default = false) => {
    try {
        const query = `INSERT INTO task_status (space_id, status_name, color, position, is_done_state, is_default) 
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const values = [space_id, status_name, color || '#9CA3AF', position || 0, is_done_state, is_default];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const updateStatusById = async (status_id, status_name, color, is_done_state) => {
    try {
        const fields = [];
        const values = [];
        let count = 1;

        if (status_name !== undefined) { fields.push(`status_name = $${count++}`); values.push(status_name); }
        if (color !== undefined) { fields.push(`color = $${count++}`); values.push(color); }
        if (is_done_state !== undefined) { fields.push(`is_done_state = $${count++}`); values.push(is_done_state); }

        if (fields.length === 0) return null;

        values.push(status_id);
        const query = `UPDATE task_status SET ${fields.join(', ')} WHERE status_id = $${count} RETURNING *`;
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const deleteStatusById = async (status_id) => {
    try {
        const query = `DELETE FROM task_status WHERE status_id = $1 RETURNING *`;
        const values = [status_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const reorderStatuses = async (status_id, new_position) => {
    try {
        const query = `UPDATE task_status SET position = $1 WHERE status_id = $2 RETURNING *`;
        const values = [new_position, status_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};
