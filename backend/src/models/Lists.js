import con from "../config/connect.js";

export const findListsByFolderId = async (folder_id) => {
  const query = `SELECT * FROM lists WHERE folder_id = $1 AND deleted_at IS NULL ORDER BY position, created_at`;
  const result = await con.query(query, [folder_id]);
  return result.rows;
};

export const findListsBySpaceId = async (space_id) => {
  const query = `SELECT * FROM lists WHERE space_id = $1 AND deleted_at IS NULL ORDER BY position, created_at`;
  const result = await con.query(query, [space_id]);
  return result.rows;
};

export const findListsBySpaceIds = async (space_ids) => {
  if (!space_ids || space_ids.length === 0) return [];
  const query = `SELECT * FROM lists WHERE space_id = ANY($1::int[]) AND deleted_at IS NULL ORDER BY position, created_at`;
  const result = await con.query(query, [space_ids]);
  return result.rows;
};

export const findListById = async (list_id) => {
  const query = `SELECT * FROM lists WHERE list_id = $1 AND deleted_at IS NULL`;
  const result = await con.query(query, [list_id]);
  return result.rows[0];
};

export const createList = async (space_id, folder_id, name, created_by) => {
  if (folder_id) {
    const folder = await con.query(
      'SELECT 1 FROM folders WHERE folder_id = $1 AND space_id = $2 AND deleted_at IS NULL',
      [folder_id, space_id]
    );
    if (folder.rows.length === 0) {
      const error = new Error('Folder does not belong to this space');
      error.statusCode = 400;
      throw error;
    }
  }

  const query = `INSERT INTO lists (space_id, folder_id, name, created_by) VALUES ($1, $2, $3, $4) RETURNING *`;
  const result = await con.query(query, [space_id, folder_id || null, name, created_by]);
  return result.rows[0];
};

export const updateList = async (list_id, name) => {
  const query = `UPDATE lists SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE list_id = $2 AND deleted_at IS NULL RETURNING *`;
  const result = await con.query(query, [name, list_id]);
  return result.rows[0];
};

export const deleteList = async (list_id) => {
  const query = `UPDATE lists SET deleted_at = CURRENT_TIMESTAMP WHERE list_id = $1 AND deleted_at IS NULL RETURNING *`;
  const result = await con.query(query, [list_id]);
  return result.rows[0];
};
