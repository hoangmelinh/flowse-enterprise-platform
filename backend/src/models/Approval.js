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
        u.avatar_url AS requester_avatar
      FROM approvals a
      JOIN tasks t ON a.task_id = t.task_id
      JOIN users u ON t.created_by = u.user_id
      WHERE a.status = 'PENDING'
      ORDER BY a.created_at DESC
    `;
    const res = await con.query(query);
    return res.rows;
  }

  /**
   * Ra quyết định: Approve hoặc Reject
   */
  static async makeDecision({ approvalId, approverId, status, decisionNote }) {
    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Invalid status. Must be APPROVED or REJECTED");
    }

    const query = `
      UPDATE approvals
      SET status = $1,
          approver_id = $2,
          decision_note = $3,
          decided_at = CURRENT_TIMESTAMP
      WHERE approval_id = $4 AND status = 'PENDING'
      RETURNING *
    `;

    const res = await con.query(query, [status, approverId, decisionNote, approvalId]);
    if (res.rows.length === 0) {
      throw new Error("Approval record not found or already processed");
    }

    const appRecord = res.rows[0];

    // Nếu duyệt thành công (APPROVED) và đây là yêu cầu cấp linh kiện cho Sự cố -> Tự động đưa Sự cố về IN_PROGRESS
    if (status === "APPROVED" && appRecord.decision_note) {
      const match = appRecord.decision_note.match(/sự cố #(\d+)/i);
      if (match && match[1]) {
        const incId = parseInt(match[1], 10);
        await con.query(
          `UPDATE tasks 
           SET current_state_id = (
             SELECT state_id FROM workflow_states 
             WHERE code = 'IN_PROGRESS' 
               AND workflow_id = (SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW')
           ),
           updated_at = CURRENT_TIMESTAMP
           WHERE task_id = (SELECT task_id FROM incidents WHERE incident_id = $1)`,
          [incId]
        );

        // Bắn thông báo cho kỹ thuật viên
        const incRes = await con.query(
          `SELECT inc.incident_id, t.task_id, t.name as task_name, inc.reported_by 
           FROM incidents inc 
           JOIN tasks t ON inc.task_id = t.task_id 
           WHERE inc.incident_id = $1`,
          [incId]
        );
        if (incRes.rows.length > 0) {
          const incRow = incRes.rows[0];
          NotificationService.dispatchPartsApprovedNotification({
            incidentId: incId,
            taskId: incRow.task_id,
            taskName: incRow.task_name,
            partName: "Vật tư đã duyệt",
            technicianUserId: incRow.reported_by,
            actorId: approverId,
          }).catch((err) => console.error("[Approval] Lỗi gửi thông báo vật tư duyệt:", err.message));
        }
      }
    }

    return appRecord;
  }
}

export default Approval;
