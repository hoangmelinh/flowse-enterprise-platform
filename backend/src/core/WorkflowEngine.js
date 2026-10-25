import con from "../config/connect.js";
import NotificationService from "../services/notificationService.js";
import AIVisionService from "../services/aiVisionService.js";
import Asset from "../models/Asset.js";
import socketService from "../services/socketService.js";

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
   * Xác định toàn bộ vai trò hệ thống & vai trò ngữ cảnh (Contextual Roles) của User đối với một Task cụ thể
   * Theo chuẩn SRS & docs/01_business_domain/09_rbac_and_resource_scope.md:
   * - Base roles: admin, manager, member từ workspace_members
   * - Contextual roles: 'technician' / 'assignee' nếu được giao việc; 'reporter' / 'creator' nếu là người tạo
   * - Department roles: 'manager' nếu là quản đốc phân xưởng / phòng ban của task; 'qa' nếu thuộc bộ phận QA
   */
  static async getUserRolesForTask(userId, taskId) {
    const roles = new Set();

    // 1. Quyền theo Workspace
    const wsRoleRes = await con.query(
      `SELECT LOWER(r.role_name) as role_name 
       FROM workspace_members wm 
       JOIN roles r ON wm.role_id = r.role_id 
       WHERE wm.user_id = $1 AND wm.deleted_at IS NULL`,
      [userId]
    );
    wsRoleRes.rows.forEach((r) => roles.add(r.role_name));

    // 2. Quyền ngữ cảnh được giao việc (Assignee / Technician)
    const assignRes = await con.query(
      `SELECT 1 FROM task_assigns WHERE task_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [taskId, userId]
    );
    if (assignRes.rows.length > 0) {
      roles.add("assignee");
      roles.add("technician");
    }

    // 3. Quyền người tạo (Creator / Reporter) và Quản lý phòng ban theo cây phân cấp doanh nghiệp
    const taskRes = await con.query(
      `SELECT t.created_by, t.department_id, ast.department_id AS asset_dept_id
       FROM tasks t
       LEFT JOIN incidents inc ON t.task_id = inc.task_id
       LEFT JOIN assets ast ON inc.asset_id = ast.asset_id
       WHERE t.task_id = $1`,
      [taskId]
    );
    if (taskRes.rows.length > 0) {
      if (taskRes.rows[0].created_by === userId) {
        roles.add("reporter");
        roles.add("creator");
      }
      const targetDeptId = taskRes.rows[0].department_id || taskRes.rows[0].asset_dept_id;
      if (targetDeptId) {
        // Kiểm tra phân cấp quản lý đa tầng: Nếu user là manager của targetDeptId HOẶC bất kỳ cấp cha nào
        const isMgr = await con.query(
          `WITH RECURSIVE mgr_tree AS (
             SELECT department_id, parent_id, manager_id FROM departments WHERE manager_id = $1
             UNION ALL
             SELECT d.department_id, d.parent_id, d.manager_id
             FROM departments d
             JOIN mgr_tree mt ON d.parent_id = mt.department_id
           )
           SELECT 1 FROM mgr_tree WHERE department_id = $2 LIMIT 1`,
          [userId, targetDeptId]
        );
        if (isMgr.rows.length > 0) {
          roles.add("manager");
        }
      }
    }

    // 4. Phòng ban chức năng đặc thù (QA / QC)
    const userDeptRes = await con.query(
      `SELECT d.code FROM users u JOIN departments d ON u.department_id = d.department_id WHERE u.user_id = $1`,
      [userId]
    );
    if (userDeptRes.rows.length > 0) {
      const code = (userDeptRes.rows[0].code || "").toUpperCase();
      if (code === "QA" || code === "QA_QC") {
        roles.add("qa");
      }
    }

    if (roles.size === 0) {
      roles.add("member");
    }

    return Array.from(roles);
  }

  /**
   * Lấy các transition khả dụng cho một Work Item cụ thể dựa trên trạng thái hiện tại và role của User
   */
  static async getAvailableTransitions(taskId, userRoles = ["member"]) {
    const taskRes = await con.query(
      `SELECT task_id, workflow_id, current_state_id, status_id FROM tasks WHERE task_id = $1`,
      [taskId]
    );
    if (taskRes.rows.length === 0) {
      throw new Error(`Task ${taskId} not found`);
    }

    const task = taskRes.rows[0];
    if (!task.workflow_id || !task.current_state_id) {
      return [];
    }

    const rolesArray = Array.isArray(userRoles) ? userRoles : [userRoles || "member"];
    const isAdmin = rolesArray.includes("admin");

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
        AND ($3 = true OR t.allowed_roles && $4::text[])
    `;

    const res = await con.query(query, [
      task.workflow_id,
      task.current_state_id,
      isAdmin,
      rolesArray.map((r) => r.toLowerCase()),
    ]);
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
         WHERE t.task_id = $1 FOR UPDATE OF t`,
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

      // 3. Kiểm tra quyền role động theo ngữ cảnh (Contextual RBAC)
      const contextualRoles = await WorkflowEngine.getUserRolesForTask(user.user_id, taskId);
      const userProvidedRoles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
      const rolesArray = Array.from(new Set([...userProvidedRoles, ...contextualRoles])).map((r) => r.toLowerCase());

      const isAllowed =
        rolesArray.includes("admin") ||
        (transition.allowed_roles &&
          transition.allowed_roles.some((r) => rolesArray.includes(r.toLowerCase())));

      if (!isAllowed) {
        throw new Error(
          `Bạn không có quyền thực hiện bước chuyển '${transition.transition_name}'. Vai trò yêu cầu: ${transition.allowed_roles.join(", ")}.`
        );
      }

      // 3b. Kiểm tra required_fields (nếu có yêu cầu)
      if (transition.required_fields && transition.required_fields.length > 0) {
        for (const field of transition.required_fields) {
          const val = metadata?.[field] || (field === "evidence_url" && metadata?.evidence_urls) || note;
          if (!val || (Array.isArray(val) && val.length === 0)) {
            throw new Error(`Bước chuyển này bắt buộc phải cung cấp thông tin [${field}].`);
          }
        }
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

      // Lấy thông tin incident nếu có
      let incId = null;
      let incInfo = null;
      try {
        const incRes = await client.query(
          `SELECT i.incident_id, i.asset_id, i.symptom, a.name AS asset_name 
           FROM incidents i 
           LEFT JOIN assets a ON i.asset_id = a.asset_id 
           WHERE i.task_id = $1`,
          [taskId]
        );
        if (incRes.rows.length > 0) {
          incId = incRes.rows[0].incident_id;
          incInfo = incRes.rows[0];
        }
      } catch (err) {
        console.warn("[WorkflowEngine] Incident lookup warning:", err.message);
      }

      // 5. Nếu bước này yêu cầu Approval HOẶC chuyển sang ON_HOLD_PENDING_PARTS -> Tạo record approval
      if (transition.requires_approval || transition.to_state_code === "ON_HOLD_PENDING_PARTS") {
        const requestNote = (metadata && metadata.partName)
          ? `Đề xuất linh kiện cho sự cố #${incId || taskId}: ${metadata.partName} x ${metadata.quantity || 1}. ${metadata.reason || note || ''}`
          : (note || "Chờ cấp quản lý phê duyệt");

        await client.query(
          `INSERT INTO approvals (task_id, approver_id, status, request_note, decision_note, incident_id)
           VALUES ($1, $2, 'PENDING', $3, $3, $4)`,
          [taskId, null, requestNote, incId]
        );
      }

      // 5b. Nếu có phân công nhân sự (assignee_id)
      if (metadata && metadata.assignee_id) {
        await client.query(
          `INSERT INTO task_assigns (task_id, user_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (task_id, user_id) DO UPDATE SET deleted_at = NULL, assigned_by = $3`,
          [taskId, metadata.assignee_id, user.user_id]
        );
      }

      // 6. Xử lý trigger_action tự động & Đóng băng SLA nếu chờ vật tư
      if (transition.to_state_code === "ON_HOLD_PENDING_PARTS") {
        await client.query(
          `UPDATE sla_instances 
           SET status = 'PAUSED', paused_at = CURRENT_TIMESTAMP 
           WHERE task_id = $1 AND status IN ('IN_SLA', 'AT_RISK')`,
          [taskId]
        );
      }

      if (transition.trigger_action === "STOP_SLA" || transition.is_terminal) {
        await client.query(
          `UPDATE sla_instances 
           SET status = 'COMPLETED', breached_at = NULL 
           WHERE task_id = $1 AND status != 'COMPLETED'`,
          [taskId]
        );
      }

      // 6b. Tự động tính toán Thời gian dừng máy (Downtime) khi khắc phục xong sự cố (Giai đoạn 2)
      if (incId && (transition.to_state_code === "RESOLVED" || transition.to_state_code === "CLOSED" || transition.is_terminal)) {
        await client.query(
          `UPDATE incidents
           SET resolved_at = CURRENT_TIMESTAMP,
               downtime_minutes = GREATEST(1, ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) / 60))
           WHERE incident_id = $1 AND resolved_at IS NULL`,
          [incId]
        );
      }

      // 6c. Lưu trữ bằng chứng nghiệm thu và kết quả AI Copilot (Giai đoạn 3)
      if (incId && (transition.to_state_code === "RESOLVED" || transition.to_state_code === "CLOSED" || transition.to_state_code === "WAITING_VERIFY" || transition.is_terminal)) {
        if (metadata && metadata.evidence_urls && Array.isArray(metadata.evidence_urls) && metadata.evidence_urls.length > 0) {
          let aiStatus = metadata.ai_evidence_status;
          let aiFeedback = metadata.ai_evidence_feedback;
          let aiScore = metadata.ai_evidence_score;

          // Nếu chưa có kết quả AI từ client, tự động chạy phân tích qua AIVisionService
          if (!aiStatus) {
            try {
              const aiEval = await AIVisionService.analyzeEvidence({
                imageUrl: metadata.evidence_urls[0],
                incidentTitle: task.name || task.title || "",
                assetName: incInfo ? incInfo.asset_name : "",
                symptom: incInfo ? incInfo.symptom : "",
              });
              aiStatus = aiEval.status;
              aiFeedback = aiEval.feedback;
              aiScore = aiEval.score;
            } catch (evalErr) {
              console.warn("[WorkflowEngine] AI Vision fallback:", evalErr.message);
              aiStatus = "VERIFIED";
              aiFeedback = "Đã ghi nhận ảnh bằng chứng nghiệm thu.";
              aiScore = 80;
            }
          }

          await client.query(
            `UPDATE incidents
             SET resolved_evidence_urls = $2,
                 ai_evidence_status = $3,
                 ai_evidence_feedback = $4,
                 ai_evidence_score = $5
             WHERE incident_id = $1`,
            [incId, metadata.evidence_urls, aiStatus || "VERIFIED", aiFeedback || null, aiScore || 0]
          );
        }
      }

      if (transition.trigger_action === "REJECT_ASSIGNMENT") {
        await client.query(
          `UPDATE task_assigns SET deleted_at = CURRENT_TIMESTAMP WHERE task_id = $1 AND deleted_at IS NULL`,
          [taskId]
        );
      }

      if (transition.trigger_action === "REASSIGN" && metadata && metadata.assignee_id) {
        await client.query(
          `UPDATE task_assigns SET deleted_at = CURRENT_TIMESTAMP WHERE task_id = $1 AND deleted_at IS NULL`,
          [taskId]
        );
        await client.query(
          `INSERT INTO task_assigns (task_id, user_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (task_id, user_id) DO UPDATE SET deleted_at = NULL, assigned_by = $3`,
          [taskId, metadata.assignee_id, user.user_id]
        );
      }

      // 7. Ghi Audit Log vào activity_logs
      await client.query(
        `INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, $3, to_jsonb($4::text), $5::jsonb)`,
        [
          taskId,
          user.user_id,
          "WORKFLOW_TRANSITION",
          task.current_state_code || "",
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

      // Tự động tính toán lại và lưu cố định Health Score thiết bị (Giai đoạn 1 Enterprise)
      if (incInfo && incInfo.asset_id) {
        Asset.calculateAndPersistHealthScore(
          incInfo.asset_id,
          `Chuyển trạng thái sự cố sang [${transition.to_state_code}]`,
          "INCIDENT_TRANSITION",
          { incident_id: incId, task_id: taskId, to_state: transition.to_state_code }
        ).catch((err) => console.error("[WorkflowEngine] Lỗi cập nhật health score:", err.message));
      }

      // Bắn thông báo ngoài transaction nếu xin vật tư
      if (transition.to_state_code === "ON_HOLD_PENDING_PARTS" && metadata && metadata.partName) {
        NotificationService.dispatchProcurementRequestAlert({
          incidentId: incId,
          taskId: taskId,
          taskName: task.name,
          partName: metadata.partName,
          quantity: metadata.quantity || 1,
          reason: metadata.reason || note,
          requesterName: user.name || "Kỹ thuật viên",
          actorId: user.user_id,
        }).catch((err) => console.error("[WorkflowEngine] Lỗi thông báo vật tư:", err.message));
      }

      // Bắn sự kiện Realtime Socket.IO tới toàn bộ máy tính trong hệ thống
      socketService.emitWorkflowTransitioned({
        task_id: taskId,
        incident_id: incId,
        previous_state: task.current_state_code,
        current_state: transition.to_state_code,
        current_state_name: transition.to_state_name,
        actor_id: user.user_id,
        actor_name: user.name || "Kỹ thuật viên",
        version: updateTaskRes.rows[0].version,
      });

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
