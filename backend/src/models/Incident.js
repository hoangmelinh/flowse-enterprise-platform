import con from "../config/connect.js";
import NotificationService from "../services/notificationService.js";

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
        u.avatar_url AS reporter_avatar,
        tech.assignee_id,
        tech.assignee_name,
        tech.assignee_avatar,
        si.status AS sla_status,
        si.deadline_at AS sla_deadline_at,
        si.started_at AS sla_started_at
      FROM incidents inc
      JOIN tasks t ON inc.task_id = t.task_id
      LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
      LEFT JOIN assets a ON inc.asset_id = a.asset_id
      LEFT JOIN users u ON inc.reported_by = u.user_id
      LEFT JOIN sla_instances si ON inc.task_id = si.task_id
      LEFT JOIN (
        SELECT ta.task_id, u.user_id AS assignee_id, u.name AS assignee_name, u.avatar_url AS assignee_avatar
        FROM task_assigns ta
        JOIN users u ON ta.user_id = u.user_id
        WHERE ta.deleted_at IS NULL
      ) tech ON t.task_id = tech.task_id
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
        v.name AS verifier_name,
        si.status AS sla_status,
        si.deadline_at AS sla_deadline_at,
        si.started_at AS sla_started_at
      FROM incidents inc
      JOIN tasks t ON inc.task_id = t.task_id
      LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
      LEFT JOIN assets a ON inc.asset_id = a.asset_id
      LEFT JOIN users u ON inc.reported_by = u.user_id
      LEFT JOIN users v ON inc.verified_by = v.user_id
      LEFT JOIN sla_instances si ON inc.task_id = si.task_id
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
        const listRes = await client.query(`SELECT list_id FROM lists WHERE deleted_at IS NULL ORDER BY list_id ASC LIMIT 1`);
        targetListId = listRes.rows[0]?.list_id;
        if (!targetListId) {
          // Tự động khởi tạo Space & List mặc định cho Vận Hành Hiện Trường nếu chưa có
          const wsRes = await client.query(`SELECT workspace_id FROM workspaces WHERE deleted_at IS NULL ORDER BY workspace_id ASC LIMIT 1`);
          const workspaceId = wsRes.rows[0]?.workspace_id || 1;

          const spRes = await client.query(
            `INSERT INTO spaces (workspace_id, name, description, color, created_by)
             VALUES ($1, 'Phân Xưởng Vận Hành (Operations)', 'Không gian quản lý hiện trường & sự cố', '#3B82F6', $2)
             RETURNING space_id`,
            [workspaceId, reported_by || null]
          );
          const spaceId = spRes.rows[0].space_id;

          await client.query(
            `INSERT INTO task_status (space_id, status_name, color, position, is_done_state, is_default)
             VALUES 
               ($1, 'TO DO', '#9CA3AF', 0, false, true),
               ($1, 'IN PROGRESS', '#2563EB', 1, false, false),
               ($1, 'COMPLETE', '#22C55E', 2, true, false)`,
            [spaceId]
          );

          const newListRes = await client.query(
            `INSERT INTO lists (space_id, name, created_by)
             VALUES ($1, 'Sự Cố Thiết Bị & Hiện Trường', $2)
             RETURNING list_id`,
            [spaceId, reported_by || null]
          );
          targetListId = newListRes.rows[0].list_id;
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

      // Tìm status_id mặc định của space/list (TO DO / DEFAULT) để thẻ không bị No Status
      const statusRes = await client.query(
        `SELECT ts.status_id 
         FROM task_status ts
         JOIN lists l ON ts.space_id = l.space_id
         WHERE l.list_id = $1 AND (ts.is_default = TRUE OR ts.position = 0)
         ORDER BY ts.position ASC LIMIT 1`,
        [targetListId]
      );
      const defaultStatusId = statusRes.rows[0]?.status_id || null;

      // 1. Tạo Work Item trong bảng tasks
      const taskRes = await client.query(
        `INSERT INTO tasks (
          name, description, list_id, created_by, priority, 
          work_item_type, workflow_id, current_state_id, status_id
        ) VALUES ($1, $2, $3, $4, $5, 'INCIDENT', $6, $7, $8)
        RETURNING *`,
        [title, symptom, targetListId, reported_by, severity === "CRITICAL" ? "Urgent" : "High", workflowId, initialStateId, defaultStatusId]
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
        `INSERT INTO activity_logs (user_id, task_id, action, new_value, details)
         VALUES ($1, $2, 'REPORT_INCIDENT', $3, $3)`,
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

      // Bắn thông báo theo RBAC (Manager/Admin + Brevo Email nếu High/Critical)
      NotificationService.dispatchIncidentAlert({
        incidentId: incident.incident_id,
        taskId: task.task_id,
        taskName: task.name || title,
        severity,
        type: "INCIDENT_REPORTED",
        priority: severity === "CRITICAL" ? "URGENT" : severity === "HIGH" ? "HIGH" : "NORMAL",
        actorId: reported_by,
      }).catch((err) => console.error("[Incident.create] Lỗi phát thông báo:", err.message));

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

  /**
   * Yêu cầu cấp phát linh kiện từ Hiện trường -> Tạo REQUEST & Approval, chuyển Incident sang ON_HOLD
   */
  static async requestSpareParts({ incidentId, partName, quantity = 1, reason = "", requestedBy }) {
    const client = await con.connect();
    try {
      await client.query("BEGIN");

      const incRes = await client.query(
        `SELECT inc.*, t.name as task_name, t.workflow_id, t.current_state_id, t.list_id
         FROM incidents inc 
         JOIN tasks t ON inc.task_id = t.task_id 
         WHERE inc.incident_id = $1`,
        [incidentId]
      );
      if (incRes.rows.length === 0) throw new Error("Không tìm thấy sự cố");
      const incident = incRes.rows[0];

      // 1. Tạo Work Item dạng REQUEST
      const reqTitle = `Yêu cầu vật tư: ${partName} (${quantity}) cho sự cố #${incident.incident_id}`;
      const taskRes = await client.query(
        `INSERT INTO tasks (name, description, list_id, created_by, priority, work_item_type)
         VALUES ($1, $2, $3, $4, 'High', 'REQUEST')
         RETURNING task_id`,
        [reqTitle, `Số lượng: ${quantity}. Lý do: ${reason}`, incident.list_id, requestedBy]
      );
      const reqTaskId = taskRes.rows[0].task_id;

      // 2. Tạo bản ghi approvals gắn trực tiếp incident_id và request_note
      const initialRequestNote = `Đề xuất linh kiện cho sự cố #${incident.incident_id} (Máy #${incident.asset_id}): ${partName} x ${quantity}. ${reason}`;
      const appRes = await client.query(
        `INSERT INTO approvals (task_id, approver_id, status, request_note, decision_note, incident_id)
         VALUES ($1, NULL, 'PENDING', $2, $2, $3)
         RETURNING approval_id`,
        [reqTaskId, initialRequestNote, incident.incident_id]
      );

      // 3. Chuyển trạng thái sự cố sang ON_HOLD_PENDING_PARTS
      const holdStateRes = await client.query(
        `SELECT state_id FROM workflow_states WHERE workflow_id = $1 AND code = 'ON_HOLD_PENDING_PARTS'`,
        [incident.workflow_id]
      );
      if (holdStateRes.rows.length > 0) {
        await client.query(
          `UPDATE tasks SET current_state_id = $1, updated_at = CURRENT_TIMESTAMP WHERE task_id = $2`,
          [holdStateRes.rows[0].state_id, incident.task_id]
        );
      }

      // 3b. Đóng băng đồng hồ SLA của sự cố (Chuyển sang PAUSED và lưu thời điểm bắt đầu chờ)
      await client.query(
        `UPDATE sla_instances 
         SET status = 'PAUSED', paused_at = CURRENT_TIMESTAMP
         WHERE task_id = $1 AND status IN ('IN_SLA', 'AT_RISK')`,
        [incident.task_id]
      );

      // 4. Ghi Audit Log
      await client.query(
        `INSERT INTO activity_logs (user_id, task_id, action, new_value, details)
         VALUES ($1, $2, 'REQUEST_SPARE_PARTS', $3, $3)`,
        [
          requestedBy,
          incident.task_id,
          JSON.stringify({
            partName,
            quantity,
            reason,
            approval_id: appRes.rows[0].approval_id,
          }),
        ]
      );

      await client.query("COMMIT");

      // Bắn thông báo cho Ban Quản trị phê duyệt vật tư (In-app + Brevo Email)
      NotificationService.dispatchProcurementRequestAlert({
        incidentId,
        taskId: incident.task_id,
        taskName: incident.task_name,
        partName,
        quantity,
        reason,
        requesterName: "Kỹ thuật viên hiện trường",
        actorId: requestedBy,
      }).catch((err) => console.error("[Incident.requestSpareParts] Lỗi phát thông báo:", err.message));

      return {
        success: true,
        approval_id: appRes.rows[0].approval_id,
        request_task_id: reqTaskId,
        new_state: "ON_HOLD_PENDING_PARTS",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Xóa sự cố và dọn dẹp các bản ghi liên quan (tasks, activity_logs, sla_instances)
   */
  static async deleteIncident(incidentId) {
    const client = await con.connect();
    try {
      await client.query("BEGIN");
      const incRes = await client.query(
        `SELECT task_id FROM incidents WHERE incident_id = $1`,
        [incidentId]
      );
      if (incRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return false;
      }
      const taskId = incRes.rows[0].task_id;

      // Xóa incident trước
      await client.query(`DELETE FROM incidents WHERE incident_id = $1`, [incidentId]);

      // Xóa activity_logs liên quan đến task này
      await client.query(`DELETE FROM activity_logs WHERE task_id = $1`, [taskId]);

      // Xóa sla_instances liên quan đến task này
      await client.query(`DELETE FROM sla_instances WHERE task_id = $1`, [taskId]);

      // Xóa task
      await client.query(`DELETE FROM tasks WHERE task_id = $1`, [taskId]);

      await client.query("COMMIT");
      return true;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Thống kê KPI Downtime và MTTR toàn phân xưởng (Giai đoạn 2)
   */
  static async getDowntimeAndMTTRStats() {
    const statsQuery = `
      SELECT 
        COUNT(*)::int AS total_incidents,
        COUNT(CASE WHEN inc.resolved_at IS NOT NULL THEN 1 END)::int AS resolved_incidents,
        COUNT(CASE WHEN inc.resolved_at IS NULL THEN 1 END)::int AS open_incidents,
        COALESCE(SUM(CASE WHEN inc.resolved_at IS NOT NULL THEN inc.downtime_minutes ELSE 0 END), 0)::int AS total_downtime_minutes,
        COALESCE(ROUND(AVG(CASE WHEN inc.resolved_at IS NOT NULL THEN inc.downtime_minutes END)), 0)::int AS mttr_minutes,
        COUNT(CASE WHEN si.status = 'COMPLETED' AND (si.breached_at IS NULL) THEN 1 END)::int AS sla_met_count,
        COUNT(CASE WHEN si.status = 'BREACHED' OR (si.breached_at IS NOT NULL) THEN 1 END)::int AS sla_breached_count
      FROM incidents inc
      JOIN tasks t ON inc.task_id = t.task_id
      LEFT JOIN sla_instances si ON inc.task_id = si.task_id
    `;

    const topAssetsQuery = `
      SELECT 
        a.asset_id,
        a.name AS asset_name,
        a.asset_code,
        a.location,
        COUNT(inc.incident_id)::int AS incident_count,
        COALESCE(SUM(inc.downtime_minutes), 0)::int AS total_downtime_minutes
      FROM assets a
      JOIN incidents inc ON a.asset_id = inc.asset_id
      WHERE inc.resolved_at IS NOT NULL
      GROUP BY a.asset_id, a.name, a.asset_code, a.location
      ORDER BY total_downtime_minutes DESC
      LIMIT 5
    `;

    const [statsRes, topAssetsRes] = await Promise.all([
      con.query(statsQuery),
      con.query(topAssetsQuery),
    ]);

    const stats = statsRes.rows[0];
    const totalDowntimeMinutes = parseInt(stats.total_downtime_minutes, 10) || 0;
    const hours = Math.floor(totalDowntimeMinutes / 60);
    const mins = totalDowntimeMinutes % 60;
    const formattedTotalDowntime = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;

    return {
      totalIncidents: stats.total_incidents,
      resolvedIncidents: stats.resolved_incidents,
      openIncidents: stats.open_incidents,
      totalDowntimeMinutes,
      formattedTotalDowntime,
      mttrMinutes: parseInt(stats.mttr_minutes, 10) || 0,
      slaMetCount: stats.sla_met_count,
      slaBreachedCount: stats.sla_breached_count,
      topDowntimeAssets: topAssetsRes.rows,
    };
  }
}

export default Incident;
