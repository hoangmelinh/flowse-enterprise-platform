import con from "../config/connect.js";
import NotificationService from "../services/notificationService.js";

class Approval {
  /**
   * Lấy danh sách approval theo người duyệt hoặc pending approvals
   */
  static async getPendingApprovals(userId) {
    const query = `
      SELECT 
        a.*,
        t.name AS task_name,
        t.description AS task_description,
        t.priority,
        t.work_item_type,
        u.name AS requester_name,
        u.email AS requester_email,
        u.avatar_url AS requester_avatar,
        inc.asset_id,
        ast.name AS asset_name,
        ast.asset_code
      FROM approvals a
      JOIN tasks t ON a.task_id = t.task_id
      JOIN users u ON t.created_by = u.user_id
      LEFT JOIN incidents inc ON a.incident_id = inc.incident_id
      LEFT JOIN assets ast ON inc.asset_id = ast.asset_id
      WHERE a.status = 'PENDING'
      ORDER BY a.created_at DESC
    `;
    const res = await con.query(query);
    return res.rows;
  }

  /**
   * Ra quyết định: Approve hoặc Reject
   * Hỗ trợ tự động phục hồi sự cố và bù giờ SLA (Δt = NOW - paused_at)
   */
  static async makeDecision({ approvalId, approverId, status, decisionNote }) {
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Invalid status. Must be APPROVED or REJECTED");
    }

    const client = await con.connect();
    try {
      await client.query("BEGIN");

      const query = `
        UPDATE approvals
        SET status = $1,
            approver_id = $2,
            decision_note = $3,
            decided_at = CURRENT_TIMESTAMP
        WHERE approval_id = $4 AND status = 'PENDING'
        RETURNING *
      `;

      const res = await client.query(query, [status, approverId, decisionNote || null, approvalId]);
      if (res.rows.length === 0) {
        throw new Error("Approval record not found or already processed");
      }

      const appRecord = res.rows[0];

      // 1. Xác định incident_id (qua khóa ngoại trực tiếp hoặc fallback qua request_note)
      let incId = appRecord.incident_id;
      if (!incId && appRecord.request_note) {
        const match = appRecord.request_note.match(/sự cố #(\d+)/i);
        if (match && match[1]) incId = parseInt(match[1], 10);
      }

      let incidentData = null;

      // 2. Nếu đây là phiếu đề xuất liên kết với Sự cố
      if (incId) {
        const incRes = await client.query(
          `SELECT inc.incident_id, t.task_id, t.name as task_name, inc.reported_by, inc.asset_id, ast.name as asset_name, ast.asset_code
           FROM incidents inc 
           JOIN tasks t ON inc.task_id = t.task_id 
           LEFT JOIN assets ast ON inc.asset_id = ast.asset_id
           WHERE inc.incident_id = $1`,
          [incId]
        );

        if (incRes.rows.length > 0) {
          incidentData = incRes.rows[0];

          if (status === "APPROVED") {
            // A. Tự động đưa sự cố về IN_PROGRESS (KTV không cần bấm nhận việc lại)
            await client.query(
              `UPDATE tasks 
               SET current_state_id = (
                 SELECT state_id FROM workflow_states 
                 WHERE code = 'IN_PROGRESS' 
                   AND workflow_id = (SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW')
               ),
               updated_at = CURRENT_TIMESTAMP
               WHERE task_id = $1`,
              [incidentData.task_id]
            );

            // B. Tự động tính toán bù giờ SLA: Δt = NOW - paused_at và dời deadline_at tương ứng
            await client.query(
              `UPDATE sla_instances
               SET deadline_at = deadline_at + (CURRENT_TIMESTAMP - paused_at),
                   status = 'IN_SLA',
                   paused_at = NULL
               WHERE task_id = $1 AND status = 'PAUSED'`,
              [incidentData.task_id]
            );

            // C. Ghi Audit Log vào activity_logs
            await client.query(
              `INSERT INTO activity_logs (user_id, task_id, action, new_value, details)
               VALUES ($1, $2, 'PARTS_APPROVED_RESUME', to_jsonb('IN_PROGRESS'::text), $3::jsonb)`,
              [
                approverId,
                incidentData.task_id,
                JSON.stringify({
                  approval_id: approvalId,
                  decision_note: decisionNote,
                  message: "Linh kiện đã được phê duyệt. Sự cố tự động tiếp tục và bù giờ SLA."
                }),
              ]
            );
          } else if (status === "REJECTED") {
            // Khi bị từ chối: Tái kích hoạt SLA với deadline đã bù trừ thời gian chờ
            await client.query(
              `UPDATE sla_instances
               SET deadline_at = deadline_at + (CURRENT_TIMESTAMP - paused_at),
                   status = 'IN_SLA',
                   paused_at = NULL
               WHERE task_id = $1 AND status = 'PAUSED'`,
              [incidentData.task_id]
            );

            await client.query(
              `INSERT INTO activity_logs (user_id, task_id, action, new_value, details)
               VALUES ($1, $2, 'PARTS_REJECTED', to_jsonb('REJECTED'::text), $3::jsonb)`,
              [
                approverId,
                incidentData.task_id,
                JSON.stringify({
                  approval_id: approvalId,
                  decision_note: decisionNote,
                  message: "Yêu cầu cấp linh kiện bị từ chối."
                }),
              ]
            );
          }
        }
      }

      await client.query("COMMIT");

      // 3. Bắn thông báo thời gian thực ngoài transaction (Non-blocking)
      if (status === "APPROVED" && incidentData) {
        NotificationService.dispatchPartsApprovedNotification({
          incidentId: incId,
          taskId: incidentData.task_id,
          taskName: incidentData.task_name,
          partName: appRecord.request_note || "Vật tư thay thế",
          technicianUserId: incidentData.reported_by,
          actorId: approverId,
        }).catch((err) => console.error("[Approval] Lỗi gửi thông báo vật tư duyệt:", err.message));
      }

      return appRecord;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export default Approval;
