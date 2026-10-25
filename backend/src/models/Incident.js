import con from "../config/connect.js";
import NotificationService from "../services/notificationService.js";
import Asset from "./Asset.js";
import socketService from "../services/socketService.js";

import Department from "./Department.js";

class Incident {
  static async getAll(user = null) {
    let whereClause = "";
    const values = [];

    if (user && user.user_id) {
      // Xác định quyền hạn và phạm vi phòng ban/phân xưởng (Resource Scope)
      const accessibleDeptIds = await Department.getAccessibleDepartmentIds(user.user_id, user.role);

      // Nếu không phải Admin (accessibleDeptIds !== null) -> Áp dụng cô lập dữ liệu theo phân xưởng
      if (accessibleDeptIds !== null) {
        values.push(user.user_id);
        values.push(accessibleDeptIds);
        whereClause = `
          WHERE (
            inc.reported_by = $1 
            OR tech.assignee_id = $1 
            OR a.department_id = ANY($2::int[])
            OR a.department_id IS NULL
          )
        `;
      }
    }

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
        a.department_id AS asset_department_id,
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
      ${whereClause}
      ORDER BY inc.created_at DESC
    `;
    const res = await con.query(query, values);
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

      // Tìm department_id từ asset nếu có
      let resolvedDeptId = null;
      if (asset_id) {
        const aRes = await client.query(`SELECT department_id FROM assets WHERE asset_id = $1`, [asset_id]);
        resolvedDeptId = aRes.rows[0]?.department_id || null;
      }

      // 1. Tạo Work Item trong bảng tasks
      const taskRes = await client.query(
        `INSERT INTO tasks (
          name, description, list_id, created_by, priority, 
          work_item_type, workflow_id, current_state_id, status_id, department_id
        ) VALUES ($1, $2, $3, $4, $5, 'INCIDENT', $6, $7, $8, $9)
        RETURNING *`,
        [title, symptom, targetListId, reported_by, severity === "CRITICAL" ? "Urgent" : "High", workflowId, initialStateId, defaultStatusId, resolvedDeptId]
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
        `INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, 'REPORT_INCIDENT', NULL, $3::jsonb)`,
        [
          task.task_id,
          reported_by,
          JSON.stringify({
            incident_id: incident.incident_id,
            asset_id,
            severity,
            symptom,
          }),
        ]
      );

      await client.query("COMMIT");

      // Tự động tính và lưu bền vững Health Score thiết bị (Giai đoạn 1 Enterprise)
      if (asset_id) {
        Asset.calculateAndPersistHealthScore(
          asset_id,
          `Phát sinh sự cố: ${task.name || title} [${severity}]`,
          "INCIDENT_REPORTED",
          { incident_id: incident.incident_id, severity }
        ).catch((err) => console.error("[Incident.create] Lỗi cập nhật health score:", err.message));
      }

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

      // Bắn sự kiện Realtime Socket.IO tới toàn bộ máy tính trong xưởng
      socketService.emitIncidentCreated({
        incident_id: incident.incident_id,
        task_id: task.task_id,
        task_name: task.name || title,
        symptom,
        severity,
        asset_id,
        state_code: "REPORTED",
        state_name: "Mới báo cáo",
        state_color: "volcano",
        reported_at: new Date().toISOString(),
        reporter_name: "Kỹ thuật viên hiện trường",
      });

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
        `SELECT inc.*, t.name as task_name, t.workflow_id, t.current_state_id, t.list_id, t.department_id, ast.department_id AS asset_dept_id
         FROM incidents inc 
         JOIN tasks t ON inc.task_id = t.task_id 
         LEFT JOIN assets ast ON inc.asset_id = ast.asset_id
         WHERE inc.incident_id = $1`,
        [incidentId]
      );
      if (incRes.rows.length === 0) throw new Error("Không tìm thấy sự cố");
      const incident = incRes.rows[0];
      const deptId = incident.department_id || incident.asset_dept_id || null;

      // 1. Tạo Work Item dạng REQUEST
      const reqTitle = `Yêu cầu vật tư: ${partName} (${quantity}) cho sự cố #${incident.incident_id}`;
      const taskRes = await client.query(
        `INSERT INTO tasks (name, description, list_id, created_by, priority, work_item_type, department_id)
         VALUES ($1, $2, $3, $4, 'High', 'REQUEST', $5)
         RETURNING task_id`,
        [reqTitle, `Số lượng: ${quantity}. Lý do: ${reason}`, incident.list_id, requestedBy, deptId]
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
        `INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, 'REQUEST_SPARE_PARTS', NULL, $3::jsonb)`,
        [
          incident.task_id,
          requestedBy,
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
   * Mở lại sự cố trong vòng 24 giờ (Reopen Protocol) per SRS & docs/01_business_domain/03_incident_management.md
   */
  static async reopenIncident({ incidentId, userId, reason = "Máy tái phát lỗi sau sửa chữa" }) {
    const client = await con.connect();
    try {
      await client.query("BEGIN");

      const incRes = await client.query(
        `SELECT inc.*, t.name as task_name, t.current_state_id, ws.code as current_state_code
         FROM incidents inc
         JOIN tasks t ON inc.task_id = t.task_id
         LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
         WHERE inc.incident_id = $1
         FOR UPDATE OF inc`,
        [incidentId]
      );
      if (incRes.rows.length === 0) throw new Error("Không tìm thấy sự cố");
      const incident = incRes.rows[0];

      // 1. Kiểm tra điều kiện 24 giờ kể từ thời điểm giải quyết
      if (!incident.resolved_at) {
        throw new Error("Sự cố chưa được đánh dấu hoàn thành, không thể mở lại.");
      }

      const diffMs = Date.now() - new Date(incident.resolved_at).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours > 24) {
        throw new Error(
          `Sự cố đã hoàn thành quá 24 giờ (${Math.round(diffHours)}h). Theo quy định, vui lòng báo cáo sự cố mới.`
        );
      }

      // 2. Chuyển trạng thái task quay lại IN_PROGRESS
      const inProgressStateRes = await client.query(
        `SELECT state_id FROM workflow_states 
         WHERE workflow_id = (SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW')
           AND code = 'IN_PROGRESS' LIMIT 1`
      );
      const inProgressStateId = inProgressStateRes.rows[0]?.state_id;

      await client.query(
        `UPDATE tasks 
         SET current_state_id = $1, version = COALESCE(version, 1) + 1, updated_at = CURRENT_TIMESTAMP
         WHERE task_id = $2`,
        [inProgressStateId, incident.task_id]
      );

      // 3. Reset resolved_at trên bảng incidents
      await client.query(
        `UPDATE incidents
         SET resolved_at = NULL
         WHERE incident_id = $1`,
        [incidentId]
      );

      // 4. Kích hoạt lại đồng hồ SLA (cấp thêm 120 phút khắc phục sự cố tái phát)
      await client.query(
        `UPDATE sla_instances
         SET status = 'IN_SLA',
             deadline_at = CURRENT_TIMESTAMP + INTERVAL '120 minutes',
             paused_at = NULL,
             breached_at = NULL
         WHERE task_id = $1`,
        [incident.task_id]
      );

      // 5. Ghi Audit Log vào activity_logs
      await client.query(
        `INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, 'INCIDENT_REOPENED', to_jsonb($3::text), $4::jsonb)`,
        [
          incident.task_id,
          userId,
          incident.current_state_code,
          JSON.stringify({
            incident_id: incidentId,
            reason,
            reopened_at: new Date().toISOString(),
          }),
        ]
      );

      await client.query("COMMIT");

      // Cập nhật lại Health Score cho thiết bị
      if (incident.asset_id) {
        Asset.calculateAndPersistHealthScore(
          incident.asset_id,
          `Mở lại sự cố #${incidentId}: ${reason}`,
          "INCIDENT_REOPENED",
          { incident_id: incidentId }
        ).catch((err) => console.error("[Incident.reopen] Lỗi cập nhật health score:", err.message));
      }

      // Realtime notification
      socketService.emitWorkflowTransitioned({
        task_id: incident.task_id,
        incident_id: incidentId,
        previous_state: incident.current_state_code,
        current_state: "IN_PROGRESS",
        current_state_name: "Đang khắc phục (Mở lại)",
        actor_id: userId,
        reason,
      });

      return {
        success: true,
        incident_id: incidentId,
        new_state: "IN_PROGRESS",
        message: "Sự cố đã được mở lại thành công trong thời hạn 24h.",
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Quản đốc phân công Kỹ thuật viên xử lý sự cố (Triage & Assignment)
   */
  static async assignTechnician({ incidentId, technicianId, assignedBy }) {
    const client = await con.connect();
    try {
      await client.query("BEGIN");

      const incRes = await client.query(
        `SELECT inc.*, t.name as task_name, t.current_state_id, ws.code as current_state_code
         FROM incidents inc
         JOIN tasks t ON inc.task_id = t.task_id
         LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
         WHERE inc.incident_id = $1`,
        [incidentId]
      );
      if (incRes.rows.length === 0) throw new Error("Không tìm thấy sự cố");
      const incident = incRes.rows[0];

      // 1. Gán kỹ thuật viên vào task_assigns
      await client.query(
        `INSERT INTO task_assigns (task_id, user_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (task_id, user_id) DO UPDATE SET deleted_at = NULL, assigned_by = $3`,
        [incident.task_id, technicianId, assignedBy]
      );

      // 2. Nếu trạng thái đang là REPORTED -> Chuyển sang ASSIGNED
      let newStateCode = incident.current_state_code;
      if (incident.current_state_code === "REPORTED") {
        const assignedStateRes = await client.query(
          `SELECT state_id FROM workflow_states 
           WHERE workflow_id = (SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW')
             AND code = 'ASSIGNED' LIMIT 1`
        );
        if (assignedStateRes.rows.length > 0) {
          await client.query(
            `UPDATE tasks 
             SET current_state_id = $1, version = COALESCE(version, 1) + 1, updated_at = CURRENT_TIMESTAMP
             WHERE task_id = $2`,
            [assignedStateRes.rows[0].state_id, incident.task_id]
          );
          newStateCode = "ASSIGNED";
        }
      }

      // 3. Ghi Audit Log vào activity_logs
      await client.query(
        `INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, 'TECHNICIAN_ASSIGNED', NULL, $3::jsonb)`,
        [
          incident.task_id,
          assignedBy,
          JSON.stringify({
            incident_id: incidentId,
            technician_id: technicianId,
            state: newStateCode,
          }),
        ]
      );

      await client.query("COMMIT");

      // Bắn thông báo cho Kỹ thuật viên được chỉ định
      NotificationService.createAssignNotificationIfNotExists(
        technicianId,
        assignedBy,
        incident.task_id,
        `Bạn được phân công xử lý sự cố: "${incident.task_name}"`
      ).catch(() => {});

      return {
        success: true,
        incident_id: incidentId,
        technician_id: technicianId,
        current_state: newStateCode,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Bổ sung bằng chứng hình ảnh hiện trường hoặc sau sửa chữa (Evidence Lifecycle)
   */
  static async appendEvidence({ incidentId, evidenceUrls = [], uploadedBy, isResolvedEvidence = false }) {
    if (!Array.isArray(evidenceUrls) || evidenceUrls.length === 0) {
      throw new Error("Danh sách evidenceUrls không được để trống");
    }

    const client = await con.connect();
    try {
      await client.query("BEGIN");

      const incRes = await client.query(
        `SELECT task_id, evidence_urls, resolved_evidence_urls FROM incidents WHERE incident_id = $1`,
        [incidentId]
      );
      if (incRes.rows.length === 0) throw new Error("Không tìm thấy sự cố");
      const inc = incRes.rows[0];

      if (isResolvedEvidence) {
        const merged = Array.from(new Set([...(inc.resolved_evidence_urls || []), ...evidenceUrls]));
        await client.query(
          `UPDATE incidents SET resolved_evidence_urls = $1 WHERE incident_id = $2`,
          [merged, incidentId]
        );
      } else {
        const merged = Array.from(new Set([...(inc.evidence_urls || []), ...evidenceUrls]));
        await client.query(
          `UPDATE incidents SET evidence_urls = $1 WHERE incident_id = $2`,
          [merged, incidentId]
        );
      }

      // Tạo bản ghi attachments cho task
      for (const url of evidenceUrls) {
        await client.query(
          `INSERT INTO attachments (task_id, file_name, file_url, uploaded_by)
           VALUES ($1, 'Ảnh bằng chứng hiện trường', $2, $3)`,
          [inc.task_id, url, uploadedBy]
        );
      }

      // Ghi Audit Log
      await client.query(
        `INSERT INTO activity_logs (task_id, user_id, action, old_value, new_value)
         VALUES ($1, $2, 'EVIDENCE_UPLOADED', NULL, $3::jsonb)`,
        [
          inc.task_id,
          uploadedBy,
          JSON.stringify({
            incident_id: incidentId,
            urls: evidenceUrls,
            is_resolved: isResolvedEvidence,
          }),
        ]
      );

      await client.query("COMMIT");
      return { success: true, incident_id: incidentId, added_count: evidenceUrls.length };
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
   * Thống kê KPI Downtime và MTTR toàn phân xưởng (Giai đoạn 2 & Mở rộng Chu kỳ)
   * @param {string} [period='month'] - 'today' | 'week' | 'month' | 'all'
   */
  static async getDowntimeAndMTTRStats(period = "month") {
    let timeCondition = "";
    if (period === "today") {
      timeCondition = "AND inc.created_at >= CURRENT_DATE";
    } else if (period === "week") {
      timeCondition = "AND inc.created_at >= DATE_TRUNC('week', CURRENT_DATE)";
    } else if (period === "month") {
      timeCondition = "AND inc.created_at >= DATE_TRUNC('month', CURRENT_DATE)";
    }

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
      WHERE 1=1 ${timeCondition}
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
      WHERE inc.resolved_at IS NOT NULL ${timeCondition}
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
      period,
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

  /**
   * Dọn dẹp dữ liệu kiểm thử mock (Các sự cố có tiêu đề 'Test Gate%' hoặc 'Test %')
   * Phục vụ Admin làm sạch giao diện và đưa Downtime về 0 trước khi chạy thật.
   */
  static async cleanTestData() {
    const client = await con.connect();
    try {
      await client.query("BEGIN");

      const testTasksRes = await client.query(`
        SELECT t.task_id, inc.incident_id 
        FROM tasks t
        LEFT JOIN incidents inc ON t.task_id = inc.task_id
        WHERE t.name ILIKE 'Test Gate%' OR t.name ILIKE 'Test %'
      `);

      if (testTasksRes.rows.length === 0) {
        await client.query("COMMIT");
        return { cleanedCount: 0 };
      }

      const taskIds = testTasksRes.rows.map(r => r.task_id).filter(Boolean);
      const incIds = testTasksRes.rows.map(r => r.incident_id).filter(Boolean);

      if (incIds.length > 0) {
        await client.query(`DELETE FROM approvals WHERE incident_id = ANY($1::int[])`, [incIds]);
        await client.query(`DELETE FROM incidents WHERE incident_id = ANY($1::int[])`, [incIds]);
      }

      if (taskIds.length > 0) {
        await client.query(`DELETE FROM approvals WHERE task_id = ANY($1::int[])`, [taskIds]);
        await client.query(`DELETE FROM sla_instances WHERE task_id = ANY($1::int[])`, [taskIds]);
        await client.query(`DELETE FROM task_assigns WHERE task_id = ANY($1::int[])`, [taskIds]);
        await client.query(`DELETE FROM time_logs WHERE task_id = ANY($1::int[])`, [taskIds]).catch(() => {});
        await client.query(`DELETE FROM activity_logs WHERE task_id = ANY($1::int[])`, [taskIds]).catch(() => {});
        await client.query(`DELETE FROM comments WHERE task_id = ANY($1::int[])`, [taskIds]).catch(() => {});
        await client.query(`DELETE FROM attachments WHERE task_id = ANY($1::int[])`, [taskIds]).catch(() => {});
        await client.query(`DELETE FROM incidents WHERE task_id = ANY($1::int[])`, [taskIds]).catch(() => {});
        await client.query(`DELETE FROM tasks WHERE task_id = ANY($1::int[])`, [taskIds]);
      }

      await client.query("COMMIT");
      return { cleanedCount: testTasksRes.rows.length };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export default Incident;
