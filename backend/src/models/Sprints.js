import con from "../config/connect.js";

export const findSprintsBySpaceIds = async (spaceIds) => {
  try {
    const query = `
      SELECT s.*, u.username AS creator_name,
             COUNT(t.task_id) AS total_tasks,
             COUNT(t.task_id) FILTER (WHERE ts.is_done_state = TRUE) AS done_tasks,
             COALESCE(SUM(t.story_points), 0) AS total_story_points,
             COALESCE(SUM(t.story_points) FILTER (WHERE ts.is_done_state = TRUE), 0) AS completed_story_points
      FROM sprints s
      LEFT JOIN users u ON u.user_id = s.created_by AND u.deleted_at IS NULL
      LEFT JOIN tasks t ON t.sprint_id = s.sprint_id AND t.is_archived = FALSE AND t.deleted_at IS NULL
      LEFT JOIN task_status ts ON ts.status_id = t.status_id
      WHERE s.space_id = ANY($1) AND s.deleted_at IS NULL
      GROUP BY s.sprint_id, u.username
      ORDER BY s.start_date DESC NULLS LAST, s.created_at DESC
    `;
    const result = await con.query(query, [spaceIds]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const findSprintById = async (sprint_id) => {
  try {
    const query = `
      SELECT s.*, u.username AS creator_name,
             COUNT(t.task_id) AS total_tasks,
             COUNT(t.task_id) FILTER (WHERE ts.is_done_state = TRUE) AS done_tasks,
             COALESCE(SUM(t.story_points), 0) AS total_story_points,
             COALESCE(SUM(t.story_points) FILTER (WHERE ts.is_done_state = TRUE), 0) AS completed_story_points
      FROM sprints s
      LEFT JOIN users u ON u.user_id = s.created_by AND u.deleted_at IS NULL
      LEFT JOIN tasks t ON t.sprint_id = s.sprint_id AND t.is_archived = FALSE AND t.deleted_at IS NULL
      LEFT JOIN task_status ts ON ts.status_id = t.status_id
      WHERE s.sprint_id = $1 AND s.deleted_at IS NULL
      GROUP BY s.sprint_id, u.username
    `;
    const result = await con.query(query, [sprint_id]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const createSprintInSpace = async (space_id, name, description, goal, status, start_date, end_date, created_by) => {
  try {
    const query = `
      INSERT INTO sprints (space_id, name, description, goal, status, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      space_id,
      name,
      description || null,
      goal || null,
      status || 'planning',
      start_date || null,
      end_date || null,
      created_by || null
    ];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const updateSprintById = async (sprint_id, name, description, goal, status, velocity, start_date, end_date) => {
  try {
    const query = `
      UPDATE sprints 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          goal = COALESCE($3, goal),
          status = COALESCE($4, status),
          velocity = COALESCE($5, velocity),
          start_date = COALESCE($6, start_date),
          end_date = COALESCE($7, end_date)
        WHERE sprint_id = $8 AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [name, description, goal, status, velocity, start_date, end_date, sprint_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const deleteSprintById = async (sprint_id) => {
  try {
    const query = `UPDATE sprints SET deleted_at = CURRENT_TIMESTAMP WHERE sprint_id = $1 AND deleted_at IS NULL RETURNING *`;
    const result = await con.query(query, [sprint_id]);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};
