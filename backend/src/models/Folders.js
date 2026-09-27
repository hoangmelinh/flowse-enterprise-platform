import con from "../config/connect.js";

export const findFoldersBySpaceId = async (space_id) => {
  const query = `SELECT * FROM folders WHERE space_id = $1 AND deleted_at IS NULL ORDER BY position, created_at`;
  const result = await con.query(query, [space_id]);
  return result.rows;
};

export const findFoldersBySpaceIds = async (space_ids) => {
  if (!space_ids || space_ids.length === 0) return [];
  const query = `SELECT * FROM folders WHERE space_id = ANY($1::int[]) AND deleted_at IS NULL ORDER BY position, created_at`;
  const result = await con.query(query, [space_ids]);
  return result.rows;
};

export const findFolderById = async (folder_id) => {
  const query = `SELECT * FROM folders WHERE folder_id = $1 AND deleted_at IS NULL`;
  const result = await con.query(query, [folder_id]);
  return result.rows[0];
};

export const createFolder = async (space_id, name, created_by) => {
  const query = `INSERT INTO folders (space_id, name, created_by) VALUES ($1, $2, $3) RETURNING *`;
  const result = await con.query(query, [space_id, name, created_by]);
  return result.rows[0];
};

export const updateFolder = async (folder_id, name) => {
  const query = `UPDATE folders SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE folder_id = $2 AND deleted_at IS NULL RETURNING *`;
  const result = await con.query(query, [name, folder_id]);
  return result.rows[0];
};

export const deleteFolder = async (folder_id) => {
  const query = `UPDATE folders SET deleted_at = CURRENT_TIMESTAMP WHERE folder_id = $1 AND deleted_at IS NULL RETURNING *`;
  const result = await con.query(query, [folder_id]);
  return result.rows[0];
};
