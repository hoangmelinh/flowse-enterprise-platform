import con from "../config/connect.js";

const BASE_TASK_SELECT = `
  SELECT 
    t.task_id,
    t.list_id,
    t.sprint_id,
    t.milestone_id,
    t.created_by,
    s.name AS space_name,
    s.color AS space_color,
    t.status_id,
    ts.status_name,
    ts.color AS status_color,
    t.priority AS priority_name,
    CASE t.priority
        WHEN 'Urgent' THEN '#ef4444'
        WHEN 'High'   THEN '#f59e0b'
        WHEN 'Normal' THEN '#3b82f6'
        WHEN 'Low'    THEN '#8b5cf6'
        WHEN 'Clear'  THEN '#9ca3af'
        ELSE 'transparent'
    END AS priority_color,
    t.name, 
    t.description, 
    t.story_points,
    t.start_date,
    t.due_date,
    t.completed_at,
    t.position,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'user_id', u.user_id,
            'name', u.name,
            'avatar_url', u.avatar_url
          )
        )
        FROM task_assigns ta
        JOIN users u ON ta.user_id = u.user_id
        WHERE ta.task_id = t.task_id
          AND ta.deleted_at IS NULL
          AND u.deleted_at IS NULL
      ), '[]'::json
    ) AS assignees
`;

const BASE_TASK_FROM_JOIN = `
  FROM tasks t
  JOIN lists l ON t.list_id = l.list_id
  JOIN spaces s ON l.space_id = s.space_id
  LEFT JOIN task_status ts ON t.status_id = ts.status_id
`;

const scopedError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getListScope = async (db, listId) => {
  const result = await db.query(
    `SELECT l.space_id, s.workspace_id
     FROM lists l
     JOIN spaces s ON l.space_id = s.space_id
     WHERE l.list_id = $1 AND l.deleted_at IS NULL AND s.deleted_at IS NULL`,
    [listId]
  );

  if (result.rows.length === 0) {
    throw scopedError("List not found", 404);
  }

  return result.rows[0];
};

const getTaskScope = async (db, taskId) => {
  const result = await db.query(
    `SELECT t.task_id, l.space_id, s.workspace_id
     FROM tasks t
     JOIN lists l ON t.list_id = l.list_id
     JOIN spaces s ON l.space_id = s.space_id
     WHERE t.task_id = $1
       AND t.deleted_at IS NULL
       AND l.deleted_at IS NULL
       AND s.deleted_at IS NULL`,
    [taskId]
  );

  if (result.rows.length === 0) {
    throw scopedError("Task not found", 404);
  }

  return result.rows[0];
};

const ensureStatusInSpace = async (db, statusId, spaceId) => {
  if (!statusId) return;

  const result = await db.query(
    'SELECT 1 FROM task_status WHERE status_id = $1 AND space_id = $2',
    [statusId, spaceId]
  );

  if (result.rows.length === 0) {
    throw scopedError("Status does not belong to this space", 400);
  }
};

const ensureSprintInSpace = async (db, sprintId, spaceId) => {
  if (!sprintId) return;

  const result = await db.query(
    'SELECT 1 FROM sprints WHERE sprint_id = $1 AND space_id = $2 AND deleted_at IS NULL',
    [sprintId, spaceId]
  );

  if (result.rows.length === 0) {
    throw scopedError("Sprint does not belong to this space", 400);
  }
};

const ensureListInSpace = async (db, listId, spaceId) => {
  if (!listId) return;

  const result = await db.query(
    'SELECT 1 FROM lists WHERE list_id = $1 AND space_id = $2 AND deleted_at IS NULL',
    [listId, spaceId]
  );

  if (result.rows.length === 0) {
    throw scopedError("List does not belong to this space", 400);
  }
};

const normalizeUserIds = (userIds = []) => [
  ...new Set(
    userIds
      .map((uid) => (typeof uid === 'object' ? uid.id : uid))
      .filter((uid) => uid !== undefined && uid !== null)
      .map((uid) => Number(uid))
      .filter((uid) => Number.isInteger(uid))
  )
];

const ensureWorkspaceMembers = async (db, workspaceId, userIds = []) => {
  const normalizedIds = normalizeUserIds(userIds);
  if (normalizedIds.length === 0) return [];

  const result = await db.query(
    `SELECT user_id
     FROM workspace_members
     WHERE workspace_id = $1
       AND user_id = ANY($2::int[])
       AND deleted_at IS NULL`,
    [workspaceId, normalizedIds]
  );

  const allowedIds = new Set(result.rows.map((row) => Number(row.user_id)));
  const invalidIds = normalizedIds.filter((uid) => !allowedIds.has(uid));

  if (invalidIds.length > 0) {
    throw scopedError("One or more users are not members of this workspace", 403);
  }

  return normalizedIds;
};

export const findAllTasksByListId = async (list_id) => {
  try {
    const query = `
      ${BASE_TASK_SELECT}
      ${BASE_TASK_FROM_JOIN}
      WHERE t.list_id = $1 
        AND t.deleted_at IS NULL 
        AND s.deleted_at IS NULL
      ORDER BY t.position ASC;
    `;
    const result = await con.query(query, [list_id]);
    return result.rows;
  } catch (error) {
    console.error("Error in findAllTasksByListId:", error);
    throw error;
  }
};

export const findAllTasksBySprintId = async (sprint_id) => {
  try {
    const query = `
      ${BASE_TASK_SELECT}
      ${BASE_TASK_FROM_JOIN}
      WHERE t.sprint_id = $1 
        AND t.deleted_at IS NULL 
        AND s.deleted_at IS NULL
      ORDER BY t.position ASC;
    `;
    const result = await con.query(query, [sprint_id]);
    return result.rows;
  } catch (error) {
    console.error("Error in findAllTasksBySprintId:", error);
    throw error;
  }
};

export const findAllTasksByUserId = async (user_id) => {
  try {
    const query = `
      ${BASE_TASK_SELECT}
      ${BASE_TASK_FROM_JOIN}
      WHERE t.deleted_at IS NULL 
        AND s.deleted_at IS NULL
        AND (
            t.created_by = $1 
            OR EXISTS (
                SELECT 1 FROM task_assigns ta 
                WHERE ta.task_id = t.task_id 
                  AND ta.user_id = $1 
                  AND ta.deleted_at IS NULL
            )
        )
      ORDER BY t.position ASC;
    `;
    const result = await con.query(query, [user_id]);
    return result.rows;
  } catch (error) {
    console.error("Error in findAllTasksByUserId:", error);
    throw error;
  }
};

export const createTask = async (name, description, space_id, due_date, created_by = null) => {
  try {
    const listRes = await con.query(
      'SELECT list_id FROM lists WHERE space_id = $1 AND deleted_at IS NULL ORDER BY position ASC LIMIT 1',
      [space_id]
    );
    if (listRes.rows.length === 0) {
      throw new Error("Không tìm thấy List nào trong Space này để tạo task (No list found in this Space)");
    }
    const list_id = listRes.rows[0].list_id;

    const statusRes = await con.query(
      'SELECT status_id FROM task_status WHERE space_id = $1 AND is_default = true LIMIT 1',
      [space_id]
    );
    const status_id = statusRes.rows[0]?.status_id || null;

    const query = `INSERT INTO tasks (name, description, list_id, status_id, start_date, due_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const values = [name, description, list_id, status_id, new Date(), due_date, created_by];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const createTaskForList = async ({
  listId,
  name,
  description,
  priority,
  assignee_ids,
  due_date,
  status_id,
  created_by
}) => {
  const client = await con.connect();

  try {
    await client.query('BEGIN');
    const { space_id, workspace_id } = await getListScope(client, listId);
    let final_status_id = status_id;

    if (!final_status_id) {
      const statusRes = await client.query(
        'SELECT status_id FROM task_status WHERE space_id = $1 AND is_default = true LIMIT 1',
        [space_id]
      );
      final_status_id = statusRes.rows[0]?.status_id || null;
    }

    await ensureStatusInSpace(client, final_status_id, space_id);
    const validAssigneeIds = await ensureWorkspaceMembers(client, workspace_id, assignee_ids || []);

    const taskQuery = `
                    INSERT INTO tasks (
                        name, description, list_id, 
                        status_id, priority, due_date, start_date, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING *`;

    const taskValues = [
      name,
      description || null,
      listId,
      final_status_id,
      priority || 'Normal',
      due_date || null,
      created_by || null
    ];

    const taskResult = await client.query(taskQuery, taskValues);
    const newTask = taskResult.rows[0];

    if (validAssigneeIds.length > 0) {
      const assignValues = [];
      const assignPlaceholders = validAssigneeIds.map((userId, idx) => {
        const taskId = newTask.task_id || newTask.id;

        assignValues.push(taskId, userId);
        return `($${idx * 2 + 1}, $${idx * 2 + 2})`;
      }).join(', ');

      const assignQuery = `INSERT INTO task_assigns (task_id, user_id) VALUES ${assignPlaceholders}`;

      await client.query(assignQuery, assignValues);
    }

    await client.query('COMMIT');

    return newTask;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const findTaskById = async (task_id) => {
  try {
    const query = `SELECT * FROM tasks WHERE task_id = $1 AND deleted_at IS NULL`;
    const values = [task_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const updateTask = async (task_id, updateData) => {
  try {
    const scope = await getTaskScope(con, task_id);

    if (updateData.list_id !== undefined && updateData.list_id !== null) {
      await ensureListInSpace(con, updateData.list_id, scope.space_id);
    }
    if (updateData.status_id !== undefined && updateData.status_id !== null) {
      await ensureStatusInSpace(con, updateData.status_id, scope.space_id);
    }
    if (updateData.sprint_id !== undefined && updateData.sprint_id !== null) {
      await ensureSprintInSpace(con, updateData.sprint_id, scope.space_id);
    }

    const allowedFields = [
      'name',
      'description',
      'due_date',
      'status_id',
      'priority',
      'start_date',
      'story_points',
      'position',
      'list_id',
      'sprint_id',
      'is_archived'
    ];

    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        fieldsToUpdate.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return null;
    }

    values.push(task_id);

    const query = `
      UPDATE tasks 
      SET ${fieldsToUpdate.join(', ')} 
      WHERE task_id = $${paramIndex} AND deleted_at IS NULL 
      RETURNING *
    `;

    const result = await con.query(query, values);

    if (result.rows.length === 0) {
      const error = new Error("Task không tồn tại hoặc đã bị xóa");
      error.statusCode = 404;
      throw error;
    }

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const deleteTask = async (taskId) => {
  const query = `
        UPDATE tasks 
        SET deleted_at = NOW() 
        WHERE task_id = $1 AND deleted_at IS NULL 
        RETURNING task_id;
    `;

  const result = await con.query(query, [taskId]);
  if (result.rows.length === 0) {
    const error = new Error("Task không tồn tại hoặc đã bị xóa");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

export const getCommentsByTaskId = async (task_id) => {
  try {
    const query = `SELECT * FROM comments WHERE task_id = $1 AND deleted_at IS NULL`;
    const values = [task_id];
    const result = await con.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const createComment = async (content, task_id, user_id) => {
  try {
    const query = `INSERT INTO comments (content, task_id, user_id) VALUES ($1, $2, $3) RETURNING *`;
    const values = [content, task_id, user_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const updateComment = async (comment_id, content) => {
  try {
    const query = `UPDATE comments SET content = $1 WHERE comment_id = $2 AND deleted_at IS NULL RETURNING *`;
    const values = [content, comment_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const deleteComment = async (comment_id) => {
  try {
    const query = `UPDATE comments SET deleted_at = NOW() WHERE comment_id = $1 AND deleted_at IS NULL RETURNING *`;
    const values = [comment_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const assignUserToTask = async (task_id, user_id) => {
  try {
    const scope = await getTaskScope(con, task_id);
    const [validUserId] = await ensureWorkspaceMembers(con, scope.workspace_id, [user_id]);

    const query = `INSERT INTO task_assigns (task_id, user_id) VALUES ($1, $2)
                   ON CONFLICT (task_id, user_id)
                   DO UPDATE SET deleted_at = NULL
                   RETURNING *`;
    const values = [task_id, validUserId];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const unassignUserFromTask = async (task_id, user_id) => {
  try {
    const query = `UPDATE task_assigns SET deleted_at = NOW() WHERE task_id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *`;
    const values = [task_id, user_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const getAssignedUsersByTaskId = async (task_id) => {
  try {
    const query = `SELECT u.user_id, u.username, u.email FROM users u JOIN task_assigns ta ON u.user_id = ta.user_id WHERE ta.task_id = $1 AND ta.deleted_at IS NULL AND u.deleted_at IS NULL`;
    const values = [task_id];
    const result = await con.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getAttachmentsByTaskId = async (task_id) => {
  try {
    const query = `SELECT a.*, u.username as uploaded_by_username 
                       FROM attachments a 
                       LEFT JOIN users u ON a.uploaded_by = u.user_id AND u.deleted_at IS NULL
                       WHERE a.task_id = $1 AND a.deleted_at IS NULL
                       ORDER BY a.created_at DESC`;
    const values = [task_id];
    const result = await con.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const deleteAttachment = async (attachment_id) => {
  try {
    const query = `UPDATE attachments SET deleted_at = NOW() WHERE attachment_id = $1 AND deleted_at IS NULL RETURNING *`;
    const values = [attachment_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const createAttachment = async (
  task_id,
  file_name,
  file_url,
  file_size,
  mime_type,
  uploaded_by,
) => {
  try {
    const query = `INSERT INTO attachments (task_id, file_name, file_url, file_size, mime_type, uploaded_by) 
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const values = [
      task_id,
      file_name,
      file_url,
      file_size,
      mime_type,
      uploaded_by,
    ];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const shareTaskToUsers = async (task_id, user_ids, shared_by) => {
  try {
    const scope = await getTaskScope(con, task_id);
    const validUserIds = await ensureWorkspaceMembers(con, scope.workspace_id, user_ids);
    if (validUserIds.length === 0) {
      throw scopedError("user_ids must contain at least one valid user id", 400);
    }

    const values = [];
    const placeholders = validUserIds.map((uid, idx) => {
      const offset = idx * 3;
      values.push(task_id, uid, shared_by);
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    }).join(', ');

    const query = `
      INSERT INTO task_assigns (task_id, user_id, assigned_by) 
      VALUES ${placeholders}
      ON CONFLICT (task_id, user_id) 
      DO UPDATE SET deleted_at = NULL, assigned_by = EXCLUDED.assigned_by, assigned_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await con.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const getShareableUsers = async (task_id) => {
  try {
    const query = `
      SELECT u.user_id, u.username, u.name, u.email, u.avatar_url
      FROM workspace_members wm
      JOIN users u ON wm.user_id = u.user_id AND u.deleted_at IS NULL
      WHERE wm.workspace_id = (
        SELECT s.workspace_id 
        FROM tasks t 
        JOIN lists l ON t.list_id = l.list_id
        JOIN spaces s ON l.space_id = s.space_id 
        WHERE t.task_id = $1 AND t.deleted_at IS NULL AND s.deleted_at IS NULL
        LIMIT 1
      )
      AND wm.workspace_id IS NOT NULL
      AND wm.deleted_at IS NULL
      AND u.user_id NOT IN (
        SELECT ta.user_id 
        FROM task_assigns ta 
        WHERE ta.task_id = $1 AND ta.deleted_at IS NULL
      )
      ORDER BY u.name ASC
    `;
    const result = await con.query(query, [task_id]);
    return result.rows;
  } catch (error) {
    throw error;
  }
};
