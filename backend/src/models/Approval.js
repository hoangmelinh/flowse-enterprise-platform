import con from "../config/connect.js";

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
    return res.rows[0];
  }
}

export default Approval;
