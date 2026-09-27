import con from "../config/connect.js";

class Incident {
  static async getAll() {
    const query = `
      SELECT 
        inc.*,
        t.name AS task_name,
        t.description AS task_description,
        t.status_id,
        t.created_at AS reported_at,
        ws.name AS state_name,
        ws.color AS state_color,
        ws.code AS state_code,
        a.asset_code,
        a.name AS asset_name,
        a.location AS asset_location,
        u.name AS reporter_name,
        u.avatar_url AS reporter_avatar
      FROM incidents inc
      JOIN tasks t ON inc.task_id = t.task_id
      LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
      LEFT JOIN assets a ON inc.asset_id = a.asset_id
      LEFT JOIN users u ON inc.reported_by = u.user_id
      ORDER BY inc.created_at DESC
    `;
    const res = await con.query(query);
    return res.rows;
  }

  static async getById(incidentId) {
    const query = `
      SELECT 
        inc.*,
        t.name AS task_name,
        t.description AS task_description,
        t.created_at AS reported_at,
        ws.name AS state_name,
        ws.color AS state_color,
        ws.code AS state_code,
        a.asset_code,
        a.name AS asset_name,
        a.location AS asset_location,
        u.name AS reporter_name,
        v.name AS verifier_name
      FROM incidents inc
      JOIN tasks t ON inc.task_id = t.task_id
      LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
      LEFT JOIN assets a ON inc.asset_id = a.asset_id
      LEFT JOIN users u ON inc.reported_by = u.user_id
      LEFT JOIN users v ON inc.verified_by = v.user_id
      WHERE inc.incident_id = $1
    `;
    const res = await con.query(query, [incidentId]);
    return res.rows[0] || null;
  }

  /**
   * Tạo Incident mới từ Mobile hoặc Web
   * Tự động sinh Task dạng INCIDENT và gắn vào INCIDENT_FLOW
   */
  static async reportIncident({
    title,
    symptom,
    asset_id,
    reported_by,
    severity = "MEDIUM",
    evidence_urls = [],
    list_id = null,
  }) {
    const client = await con.connect();
    try {
      await client.query("BEGIN");

      // Tìm list_id mặc định nếu không truyền
      let targetListId = list_id;
      if (!targetListId) {
        const listRes = await client.query(`SELECT list_id FROM lists WHERE deleted_at IS NULL LIMIT 1`);
        targetListId = listRes.rows[0]?.list_id;
        if (!targetListId) {
          throw new Error("Không tìm thấy List khả dụng để gắn Incident.");
        }
      }

      // Lấy workflow INCIDENT_FLOW và Initial State (REPORTED)
      const wfRes = await client.query(
        `SELECT w.workflow_id, s.state_id 
         FROM workflow_definitions w
         JOIN workflow_states s ON w.workflow_id = s.workflow_id
         WHERE w.code = 'INCIDENT_FLOW' AND s.is_initial = true
         LIMIT 1`
      );

      const workflowId = wfRes.rows[0]?.workflow_id || null;
      const initialStateId = wfRes.rows[0]?.state_id || null;

      // 1. Tạo Work Item trong bảng tasks
      const taskRes = await client.query(
        `INSERT INTO tasks (
          name, description, list_id, created_by, priority, 
          work_item_type, workflow_id, current_state_id
        ) VALUES ($1, $2, $3, $4, $5, 'INCIDENT', $6, $7)
        RETURNING *`,
        [title, symptom, targetListId, reported_by, severity === "CRITICAL" ? "Urgent" : "High", workflowId, initialStateId]
      );
      const task = taskRes.rows[0];

      // 2. Tạo record incidents
      const incRes = await client.query(
        `INSERT INTO incidents (
          task_id, asset_id, reported_by, severity, symptom, evidence_urls
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [task.task_id, asset_id, reported_by, severity, symptom, evidence_urls]
      );
      const incident = incRes.rows[0];

      // 3. Khởi tạo SLA instance (vd: Critical = 60 phút, High = 120 phút, Medium = 240 phút)
      const targetMinutes = severity === "CRITICAL" ? 60 : severity === "HIGH" ? 120 : 240;
      await client.query(
        `INSERT INTO sla_instances (task_id, deadline_at, status)
         VALUES ($1, CURRENT_TIMESTAMP + ($2 || ' minutes')::INTERVAL, 'IN_SLA')`,
        [task.task_id, targetMinutes]
      );

      // 4. Ghi Audit Log
      await client.query(
        `INSERT INTO activity_logs (user_id, task_id, action, details)
         VALUES ($1, $2, 'REPORT_INCIDENT', $3)`,
        [
          reported_by,
          task.task_id,
          JSON.stringify({
            incident_id: incident.incident_id,
            asset_id,
            severity,
            symptom,
          }),
        ]
      );

      await client.query("COMMIT");
      return {
        ...incident,
        task,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export default Incident;
