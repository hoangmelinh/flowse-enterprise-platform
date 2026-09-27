import con from "../config/connect.js";

const accessibleSpaceCondition = `
  (
    sm.user_id IS NOT NULL
    OR (s.is_private = FALSE AND wm.user_id IS NOT NULL)
  )
`;

const appendOptionalSpaceNameFilter = (query, params, spaceName, paramIndex) => {
  if (!spaceName) return { query, paramIndex };

  params.push(`%${spaceName}%`);
  return {
    query: `${query} AND LOWER(s.name) LIKE LOWER($${paramIndex})`,
    paramIndex: paramIndex + 1,
  };
};

export const getAccessibleSpacesForUser = async (userId) => {
  const result = await con.query(
    `SELECT DISTINCT s.space_id, s.name
     FROM spaces s
     LEFT JOIN space_members sm
       ON s.space_id = sm.space_id
      AND sm.user_id = $1
      AND sm.deleted_at IS NULL
     LEFT JOIN workspace_members wm
       ON s.workspace_id = wm.workspace_id
      AND wm.user_id = $1
      AND wm.deleted_at IS NULL
     WHERE s.deleted_at IS NULL
       AND ${accessibleSpaceCondition}
     ORDER BY s.name ASC`,
    [userId]
  );

  return result.rows;
};

export const getFirstWorkspaceForUser = async (userId) => {
  const result = await con.query(
    `SELECT workspace_id
     FROM workspace_members
     WHERE user_id = $1 AND deleted_at IS NULL
     ORDER BY joined_at ASC
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
};

export const findTasksForAi = async (userId, args = {}) => {
  let query = `
    SELECT t.task_id, t.name, t.due_date, t.completed_at,
           ts.status_name AS status, t.priority,
           s.name AS space_name
    FROM tasks t
    JOIN lists l ON t.list_id = l.list_id
    JOIN spaces s ON l.space_id = s.space_id
    LEFT JOIN space_members sm
      ON s.space_id = sm.space_id
     AND sm.user_id = $1
     AND sm.deleted_at IS NULL
    LEFT JOIN workspace_members wm
      ON s.workspace_id = wm.workspace_id
     AND wm.user_id = $1
     AND wm.deleted_at IS NULL
    LEFT JOIN task_status ts ON t.status_id = ts.status_id
    WHERE t.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND ${accessibleSpaceCondition}
  `;
  const params = [userId];
  let idx = 2;

  ({ query, paramIndex: idx } = appendOptionalSpaceNameFilter(
    query,
    params,
    args.space_name,
    idx
  ));

  if (args.status) {
    query += ` AND LOWER(ts.status_name) = LOWER($${idx})`;
    params.push(args.status);
    idx += 1;
  }

  if (args.priority) {
    query += ` AND LOWER(t.priority) = LOWER($${idx})`;
    params.push(args.priority);
    idx += 1;
  }

  query += ` ORDER BY t.created_at DESC LIMIT $${idx}`;
  params.push(args.limit || 20);

  const result = await con.query(query, params);
  return result.rows;
};

export const countTasksByStatusForAi = async (userId, args = {}) => {
  let query = `
    SELECT COALESCE(ts.status_name, 'Không có trạng thái') AS status,
           COUNT(*)::int AS count
    FROM tasks t
    JOIN lists l ON t.list_id = l.list_id
    JOIN spaces s ON l.space_id = s.space_id
    LEFT JOIN space_members sm
      ON s.space_id = sm.space_id
     AND sm.user_id = $1
     AND sm.deleted_at IS NULL
    LEFT JOIN workspace_members wm
      ON s.workspace_id = wm.workspace_id
     AND wm.user_id = $1
     AND wm.deleted_at IS NULL
    LEFT JOIN task_status ts ON t.status_id = ts.status_id
    WHERE t.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND ${accessibleSpaceCondition}
  `;
  const params = [userId];
  let idx = 2;

  ({ query, paramIndex: idx } = appendOptionalSpaceNameFilter(
    query,
    params,
    args.space_name,
    idx
  ));

  query += ` GROUP BY ts.status_name ORDER BY count DESC`;

  const result = await con.query(query, params);
  return result.rows;
};

export const findOverdueTasksForAi = async (userId, args = {}) => {
  let query = `
    SELECT t.task_id, t.name, t.due_date,
           ts.status_name AS status, t.priority,
           s.name AS space_name
    FROM tasks t
    JOIN lists l ON t.list_id = l.list_id
    JOIN spaces s ON l.space_id = s.space_id
    LEFT JOIN space_members sm
      ON s.space_id = sm.space_id
     AND sm.user_id = $1
     AND sm.deleted_at IS NULL
    LEFT JOIN workspace_members wm
      ON s.workspace_id = wm.workspace_id
     AND wm.user_id = $1
     AND wm.deleted_at IS NULL
    LEFT JOIN task_status ts ON t.status_id = ts.status_id
    WHERE t.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND ${accessibleSpaceCondition}
      AND t.completed_at IS NULL
      AND t.due_date < NOW()
  `;
  const params = [userId];
  let idx = 2;

  ({ query, paramIndex: idx } = appendOptionalSpaceNameFilter(
    query,
    params,
    args.space_name,
    idx
  ));

  query += ` ORDER BY t.due_date ASC LIMIT 30`;

  const result = await con.query(query, params);
  return result.rows;
};

export const findAssignableMembersForSpace = async (spaceId) => {
  const result = await con.query(
    `SELECT DISTINCT u.user_id, u.username, u.name, u.email
     FROM spaces s
     JOIN workspace_members wm
       ON wm.workspace_id = s.workspace_id
      AND wm.deleted_at IS NULL
     JOIN users u ON wm.user_id = u.user_id AND u.deleted_at IS NULL
     LEFT JOIN space_members sm
       ON sm.space_id = s.space_id
      AND sm.user_id = wm.user_id
      AND sm.deleted_at IS NULL
     WHERE s.space_id = $1
       AND s.deleted_at IS NULL
       AND (
         s.is_private = FALSE
         OR sm.user_id IS NOT NULL
       )
     ORDER BY u.name ASC`,
    [spaceId]
  );

  return result.rows;
};

export const findDefaultListIdForSpace = async (spaceId) => {
  const result = await con.query(
    `SELECT list_id
     FROM lists
     WHERE space_id = $1 AND deleted_at IS NULL
     ORDER BY position ASC
     LIMIT 1`,
    [spaceId]
  );

  return result.rows[0]?.list_id || null;
};
