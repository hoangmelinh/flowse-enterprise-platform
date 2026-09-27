import con from "../config/connect.js";

/**
 * Universal Workflow Engine for Flowse Enterprise Platform (Flowse 2.0)
 * Quản lý vòng đời trạng thái của Work Items: Task, Incident, Inspection, Request.
 */
class WorkflowEngine {
  /**
   * Lấy danh sách workflow
   */
  static async getWorkflows() {
    const query = `
      SELECT 
        w.*,
        (SELECT COUNT(*) FROM workflow_states s WHERE s.workflow_id = w.workflow_id) AS state_count
      FROM workflow_definitions w
      WHERE w.is_active = true
      ORDER BY w.workflow_id ASC
    `;
    const res = await con.query(query);
    return res.rows;
  }

  /**
   * Lấy chi tiết workflow kèm danh sách State và Transition
   */
  static async getWorkflowDetails(workflowId) {
    const wfRes = await con.query(
      `SELECT * FROM workflow_definitions WHERE workflow_id = $1`,
      [workflowId]
    );
    if (wfRes.rows.length === 0) return null;

    const statesRes = await con.query(
      `SELECT * FROM workflow_states WHERE workflow_id = $1 ORDER BY position ASC, state_id ASC`,
      [workflowId]
    );

    const transitionsRes = await con.query(
      `SELECT 
        t.*,
        fs.name AS from_state_name,
        fs.code AS from_state_code,
        ts.name AS to_state_name,
        ts.code AS to_state_code
      FROM workflow_transitions t
      JOIN workflow_states fs ON t.from_state_id = fs.state_id
      JOIN workflow_states ts ON t.to_state_id = ts.state_id
      WHERE t.workflow_id = $1`,
      [workflowId]
    );

    return {
      workflow: wfRes.rows[0],
      states: statesRes.rows,
      transitions: transitionsRes.rows,
    };
  }

  /**
   * Lấy các transition khả dụng cho một Work Item cụ thể dựa trên trạng thái hiện tại và role của User
   */
  static async getAvailableTransitions(taskId, userRole = "member") {
    const taskRes = await con.query(
      `SELECT task_id, workflow_id, current_state_id, status_id FROM tasks WHERE task_id = $1`,
      [taskId]
    );
    if (taskRes.rows.length === 0) {
      throw new Error(`Task ${taskId} not found`);
    }

    const task = taskRes.rows[0];
    if (!task.workflow_id || !task.current_state_id) {
      // Nếu task chưa gắn workflow mới, trả về rỗng để fallback về kanban status cũ
      return [];
    }

    const query = `
      SELECT 
        t.transition_id,
        t.transition_name,
        t.to_state_id,
        t.requires_approval,
        t.required_fields,
        ts.code AS to_state_code,
        ts.name AS to_state_name,
        ts.color AS to_state_color,
        ts.is_terminal
      FROM workflow_transitions t
      JOIN workflow_states ts ON t.to_state_id = ts.state_id
      WHERE t.workflow_id = $1 
        AND t.from_state_id = $2
        AND ($3 = ANY(t.allowed_roles) OR 'admin' = $3)
    `;

    const res = await con.query(query, [task.workflow_id, task.current_state_id, userRole.toLowerCase()]);
    return res.rows;
  }

  /**
   * Thực hiện chuyển đổi trạng thái (State Transition) với đầy đủ validation và audit trail
   */
  static async executeTransition({ taskId, toStateId, user, note = "", metadata = {} }) {
    const client = await con.connect();
    try {
      await client.query("BEGIN");

      // 1. Kiểm tra Task hiện tại
      const taskRes = await client.query(
        `SELECT t.*, ws.code AS current_state_code, ws.name AS current_state_name 
         FROM tasks t
         LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
         WHERE t.task_id = $1 FOR UPDATE`,
        [taskId]
      );

      if (taskRes.rows.length === 0) {
        throw new Error("Task not found");
      }
      const task = taskRes.rows[0];

      // 2. Kiểm tra transition hợp lệ
      const transRes = await client.query(
        `SELECT t.*, ts.name AS to_state_name, ts.code AS to_state_code, ts.is_terminal
         FROM workflow_transitions t
         JOIN workflow_states ts ON t.to_state_id = ts.state_id
         WHERE t.workflow_id = $1 
           AND t.from_state_id = $2 
           AND t.to_state_id = $3`,
        [task.workflow_id, task.current_state_id, toStateId]
      );

      if (transRes.rows.length === 0) {
        throw new Error(
          `Không thể chuyển từ trạng thái '${task.current_state_name || "N/A"}' sang trạng thái đích đã chọn.`
        );
      }
      const transition = transRes.rows[0];

      // 3. Kiểm tra quyền role
      const userRole = (user.role_name || "member").toLowerCase();
      const isAllowed = userRole === "admin" || (transition.allowed_roles && transition.allowed_roles.includes(userRole));
      if (!isAllowed) {
        throw new Error(`Bạn không có quyền thực hiện bước chuyển '${transition.transition_name}'.`);
      }

      // 4. Cập nhật trạng thái Task và tăng Version (hỗ trợ optimistic lock cho sync)
      const updateTaskRes = await client.query(
        `UPDATE tasks 
         SET current_state_id = $1, 
             version = COALESCE(version, 1) + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE task_id = $2
         RETURNING task_id, current_state_id, version`,
        [toStateId, taskId]
      );

      // 5. Nếu bước này yêu cầu Approval -> Tạo record approval
      if (transition.requires_approval) {
        await client.query(
          `INSERT INTO approvals (task_id, approver_id, status, decision_note)
           VALUES ($1, $2, 'PENDING', $3)`,
          [taskId, null, note || "Chờ cấp quản lý phê duyệt"]
        );
      }

      // 6. Xử lý trigger_action tự động
      if (transition.trigger_action === "STOP_SLA" || transition.is_terminal) {
        await client.query(
          `UPDATE sla_instances 
           SET status = 'COMPLETED', breached_at = NULL 
           WHERE task_id = $1 AND status != 'COMPLETED'`,
          [taskId]
        );
      }

      // 7. Ghi Audit Log vào activity_logs
      await client.query(
        `INSERT INTO activity_logs (user_id, task_id, action, details)
         VALUES ($1, $2, $3, $4)`,
        [
          user.user_id,
          taskId,
          "WORKFLOW_TRANSITION",
          JSON.stringify({
            transition_id: transition.transition_id,
            transition_name: transition.transition_name,
            from_state: task.current_state_code,
            to_state: transition.to_state_code,
            note: note,
            metadata: metadata,
            timestamp: new Date().toISOString(),
          }),
        ]
      );

      await client.query("COMMIT");

      return {
        success: true,
        task_id: taskId,
        previous_state: task.current_state_code,
        current_state: transition.to_state_code,
        current_state_name: transition.to_state_name,
        version: updateTaskRes.rows[0].version,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export default WorkflowEngine;
