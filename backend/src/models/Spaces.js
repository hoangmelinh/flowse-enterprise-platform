import con from "../config/connect.js";

export const findAllSpacesByWorkspaceId = async (workspace_id, user_id) => {
  try {
    const query = `
      SELECT *
      FROM spaces s
      WHERE s.workspace_id = $1
        AND s.deleted_at IS NULL
        AND (
          s.is_private = FALSE
          OR EXISTS (
            SELECT 1
            FROM space_members sm
            WHERE sm.space_id = s.space_id
              AND sm.user_id = $2
              AND sm.deleted_at IS NULL
          )
        )
      ORDER BY s.created_at, s.space_id`;
    const values = [workspace_id, user_id];
    const result = await con.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const createSpaces = async (
  name,
  description,
  workspace_id,
  is_private = false,
  options = {},
) => {
  const {
    createdBy = null,
    addCreatorAsMember = false,
    createDefaultList = false,
    defaultListName = 'General',
  } = options;
  const client = await con.connect();
  try {
    await client.query('BEGIN');

    const spaceQuery = `
            INSERT INTO spaces (workspace_id, name, description, is_private) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *`;
    const spaceValues = [workspace_id, name, description, is_private];
    const spaceResult = await client.query(spaceQuery, spaceValues);
    const newSpace = spaceResult.rows[0];
    const spaceId = newSpace.space_id;

    const statusQuery = `
            INSERT INTO task_status (space_id, status_name, color, position, is_done_state, is_default)
            VALUES 
                ($1, 'TO DO', '#9CA3AF', 0, false, true),
                ($1, 'IN PROGRESS', '#2563EB', 1, false, false),
                ($1, 'COMPLETE', '#22C55E', 2, true, false)
        `;

    await client.query(statusQuery, [spaceId]);

    if (addCreatorAsMember && createdBy) {
      await client.query(
        `INSERT INTO space_members (space_id, user_id, role_id)
         SELECT $1, $2, wm.role_id
         FROM workspace_members wm
         WHERE wm.workspace_id = $3
           AND wm.user_id = $2
           AND wm.deleted_at IS NULL
         ON CONFLICT (space_id, user_id)
         DO UPDATE SET deleted_at = NULL, role_id = EXCLUDED.role_id`,
        [spaceId, createdBy, workspace_id]
      );
    }

    if (createDefaultList && createdBy) {
      await client.query(
        `INSERT INTO lists (space_id, name, created_by)
         VALUES ($1, $2, $3)`,
        [spaceId, defaultListName, createdBy]
      );
    }

    await client.query('COMMIT');

    return newSpace;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const findSpaceById = async (space_id) => {
  try {
    const query = `SELECT * FROM spaces WHERE space_id = $1 AND deleted_at IS NULL`;
    const values = [space_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};
export const updateSpace = async (space_id, name, description, is_private = false) => {
  try {
    const query = `UPDATE spaces SET name = $1, description = $2, is_private = $3 WHERE space_id = $4 AND deleted_at IS NULL RETURNING *`;
    const values = [name, description, is_private, space_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const deleteSpace = async (space_id, user_id) => {
  try {
    const query = `UPDATE spaces SET deleted_at = CURRENT_TIMESTAMP WHERE space_id = $1 AND deleted_at IS NULL RETURNING *`;
    const values = [space_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const findSpaceMembers = async (space_id) => {
  try {
    const query = `
      SELECT
        u.user_id,
        u.username,
        COALESCE(NULLIF(u.name, ''), u.username, u.email) AS name,
        u.email,
        u.avatar_url,
        COALESCE(space_role.role_name, workspace_role.role_name) AS role_name
      FROM spaces s
      JOIN workspace_members wm
        ON wm.workspace_id = s.workspace_id
       AND wm.deleted_at IS NULL
      JOIN users u
        ON u.user_id = wm.user_id
       AND u.deleted_at IS NULL
      LEFT JOIN space_members sm
        ON sm.space_id = s.space_id
       AND sm.user_id = u.user_id
       AND sm.deleted_at IS NULL
      LEFT JOIN roles space_role
        ON space_role.role_id = sm.role_id
      LEFT JOIN roles workspace_role
        ON workspace_role.role_id = wm.role_id
      WHERE s.space_id = $1
        AND s.deleted_at IS NULL
        AND (
          s.is_private = FALSE
          OR sm.user_id IS NOT NULL
        )
      ORDER BY LOWER(COALESCE(NULLIF(u.name, ''), u.username, u.email)), u.user_id`;
    const values = [space_id];
    const result = await con.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  }
};

export const addSpaceMember = async (space_id, user_id) => {
  try {
    const membership = await con.query(
      `SELECT 1
       FROM workspace_members wm
       JOIN spaces s ON s.workspace_id = wm.workspace_id
       WHERE s.space_id = $1 AND wm.user_id = $2 AND wm.deleted_at IS NULL AND s.deleted_at IS NULL`,
      [space_id, user_id]
    );

    if (membership.rows.length === 0) {
      const error = new Error('User is not a member of this workspace');
      error.statusCode = 403;
      throw error;
    }

    const query = `INSERT INTO space_members (space_id, user_id, role_id)
                   SELECT $1, $2, wm.role_id
                   FROM workspace_members wm
                   JOIN spaces s ON s.workspace_id = wm.workspace_id
                   WHERE s.space_id = $1
                     AND wm.user_id = $2
                     AND wm.deleted_at IS NULL
                     AND s.deleted_at IS NULL
                   ON CONFLICT (space_id, user_id)
                   DO UPDATE SET deleted_at = NULL, role_id = EXCLUDED.role_id
                   RETURNING *`;
    const values = [space_id, user_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

export const removeSpaceMember = async (space_id, user_id) => {
  try {
    const query = `UPDATE space_members SET deleted_at = CURRENT_TIMESTAMP WHERE space_id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *`;
    const values = [space_id, user_id];
    const result = await con.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw error;
  }
};
