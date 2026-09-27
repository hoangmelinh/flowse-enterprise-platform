import con from "../config/connect.js";

export const findMilestonesBySpaceId = async (space_id) => {
  try {
    const query = `
      SELECT m.*, u.username AS creator_name,
             COUNT(t.task_id) AS total_tasks,
             COUNT(t.task_id) FILTER (WHERE ts.is_done_state = TRUE) AS done_tasks
      FROM milestones m
      LEFT JOIN users u ON u.user_id = m.created_by AND u.deleted_at IS NULL
      LEFT JOIN tasks t ON t.milestone_id = m.milestone_id AND t.is_archived = FALSE AND t.deleted_at IS NULL
      LEFT JOIN task_status ts ON ts.status_id = t.status_id
      WHERE m.space_id = $1 AND m.deleted_at IS NULL
      GROUP BY m.milestone_id, u.username
      ORDER BY m.due_date ASC NULLS LAST, m.created_at DESC
    `;
    const result = await con.query(query, [space_id]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const findMilestonesByListId = async (list_id) => {
  try {
    const query = `
      SELECT m.*, u.username AS creator_name,
             COUNT(t.task_id) AS total_tasks,
             COUNT(t.task_id) FILTER (WHERE ts.is_done_state = TRUE) AS done_tasks
      FROM milestones m
      LEFT JOIN users u ON u.user_id = m.created_by AND u.deleted_at IS NULL
      LEFT JOIN tasks t ON t.milestone_id = m.milestone_id AND t.is_archived = FALSE AND t.deleted_at IS NULL
      LEFT JOIN task_status ts ON ts.status_id = t.status_id
      WHERE m.list_id = $1 AND m.deleted_at IS NULL
      GROUP BY m.milestone_id, u.username
      ORDER BY m.due_date ASC NULLS LAST, m.created_at DESC
    `;
    const result = await con.query(query, [list_id]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const findMilestoneById = async (milestone_id) => {
  try {
    const query = `
      SELECT m.*, u.username AS creator_name,
             COUNT(t.task_id) AS total_tasks,
             COUNT(t.task_id) FILTER (WHERE ts.is_done_state = TRUE) AS done_tasks
      FROM milestones m
      LEFT JOIN users u ON u.user_id = m.created_by AND u.deleted_at IS NULL
      LEFT JOIN tasks t ON t.milestone_id = m.milestone_id AND t.is_archived = FALSE AND t.deleted_at IS NULL
      LEFT JOIN task_status ts ON ts.status_id = t.status_id
      WHERE m.milestone_id = $1 AND m.deleted_at IS NULL
      GROUP BY m.milestone_id, u.username
    `;
    const result = await con.query(query, [milestone_id]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const createMilestoneInList = async (list_id, name, description, status, color, due_date, created_by) => {
  try {
    const scopeResult = await con.query(
      'SELECT space_id FROM lists WHERE list_id = $1 AND deleted_at IS NULL',
      [list_id]
    );

    if (scopeResult.rows.length === 0) {
      const error = new Error("List not found");
      error.statusCode = 404;
      throw error;
    }

    const query = `
      INSERT INTO milestones (space_id, list_id, name, description, status, color, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      scopeResult.rows[0].space_id,
      list_id,
      name,
      description || null,
      status || 'on_track',
      color || '#00D4AA',
      due_date || null,
      created_by || null
    ];
    const result = await con.query(query, values);
    return findMilestoneById(result.rows[0].milestone_id);
  } catch (error) {
    throw error;
  }
};

export const createMilestoneInSpace = async (space_id, name, description, status, color, due_date, created_by) => {
  try {
    const query = `
      INSERT INTO milestones (space_id, name, description, status, color, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      space_id,
      name,
      description || null,
      status || 'on_track',
      color || '#00D4AA',
      due_date || null,
      created_by || null
    ];
    const result = await con.query(query, values);
    return findMilestoneById(result.rows[0].milestone_id);
  } catch (error) {
    throw error;
  }
};

export const updateMilestoneById = async (milestone_id, name, description, status, color, due_date) => {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    const allowedUpdates = { name, description, status, color, due_date };
    for (const [field, value] of Object.entries(allowedUpdates)) {
      if (value !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    values.push(milestone_id);

    const query = `
      UPDATE milestones
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE milestone_id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await con.query(query, values);
    return result.rows[0] ? findMilestoneById(result.rows[0].milestone_id) : null;
  } catch (error) {
    throw error;
  }
};

export const deleteMilestoneById = async (milestone_id) => {
  try {
    const query = `UPDATE milestones SET deleted_at = CURRENT_TIMESTAMP WHERE milestone_id = $1 AND deleted_at IS NULL RETURNING *`;
    const result = await con.query(query, [milestone_id]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};
