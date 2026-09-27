import con from "../config/connect.js";

class Asset {
  static async getAll() {
    const res = await con.query(`
      SELECT 
        a.*,
        d.name AS department_name,
        (SELECT COUNT(*) FROM incidents inc WHERE inc.asset_id = a.asset_id) AS incident_count
      FROM assets a
      LEFT JOIN departments d ON a.department_id = d.department_id
      ORDER BY a.asset_id ASC
    `);
    return res.rows;
  }

  static async getById(assetId) {
    const res = await con.query(
      `SELECT a.*, d.name AS department_name 
       FROM assets a
       LEFT JOIN departments d ON a.department_id = d.department_id
       WHERE a.asset_id = $1`,
      [assetId]
    );
    return res.rows[0] || null;
  }

  /**
   * Resolve QR token để trả về Digital Context cho Mobile / Field Worker
   */
  static async resolveQrToken(token) {
    const assetRes = await con.query(
      `SELECT a.*, d.name AS department_name 
       FROM assets a
       LEFT JOIN departments d ON a.department_id = d.department_id
       WHERE a.qr_token = $1`,
      [token]
    );

    if (assetRes.rows.length === 0) {
      return null;
    }
    const asset = assetRes.rows[0];

    // Lấy các Incident đang mở của máy này
    const incidentsRes = await con.query(
      `SELECT 
         inc.*,
         t.name AS task_name,
         t.status_id,
         ws.name AS state_name,
         ws.color AS state_color,
         u.name AS reporter_name
       FROM incidents inc
       JOIN tasks t ON inc.task_id = t.task_id
       LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
       LEFT JOIN users u ON inc.reported_by = u.user_id
       WHERE inc.asset_id = $1 AND (ws.is_terminal IS NULL OR ws.is_terminal = false)
       ORDER BY inc.created_at DESC`,
      [asset.asset_id]
    );

    // Lấy danh sách Checklist kiểm tra gắn với máy này
    const checklistsRes = await con.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.checklist_id = c.checklist_id) AS item_count
       FROM checklists c
       WHERE c.asset_id = $1 AND c.is_active = true`,
      [asset.asset_id]
    );

    return {
      asset,
      open_incidents: incidentsRes.rows,
      available_checklists: checklistsRes.rows,
    };
  }

  static async create({ asset_code, name, location, department_id, qr_token, specs = {} }) {
    const token = qr_token || `QR-${asset_code}-${Date.now()}`;
    const res = await con.query(
      `INSERT INTO assets (asset_code, name, location, department_id, qr_token, specs)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [asset_code, name, location, department_id, token, JSON.stringify(specs)]
    );
    return res.rows[0];
  }
}

export default Asset;
