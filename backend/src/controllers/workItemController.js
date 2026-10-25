import con from "../config/connect.js";
import WorkflowEngine from "../core/WorkflowEngine.js";
import Incident from "../models/Incident.js";
import { createTaskForList } from "../models/Task.js";

/**
 * GET /api/v1/work-items/my-work
 * Lấy danh sách việc của tôi (Today, Overdue, Waiting, In Progress) per API Contract Matrix 2.2
 */
export const getMyWork = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const query = `
      SELECT 
        t.task_id AS id,
        COALESCE(t.work_item_type, 'TASK') AS type,
        t.name AS title,
        t.description,
        t.priority,
        t.due_date,
        t.version,
        t.department_id,
        d.name AS department_name,
        ws.code AS current_state_code,
        ws.name AS current_state_name,
        ws.color AS state_color,
        ws.is_terminal,
        si.status AS sla_status,
        si.deadline_at AS sla_deadline_at,
        ast.name AS asset_name,
        ast.asset_code,
        t.created_at,
        t.updated_at
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.department_id
      LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
      LEFT JOIN sla_instances si ON t.task_id = si.task_id
      LEFT JOIN incidents inc ON t.task_id = inc.task_id
      LEFT JOIN assets ast ON inc.asset_id = ast.asset_id
      WHERE t.deleted_at IS NULL
        AND (
          t.created_by = $1
          OR EXISTS (
            SELECT 1 FROM task_assigns ta 
            WHERE ta.task_id = t.task_id AND ta.user_id = $1 AND ta.deleted_at IS NULL
          )
        )
      ORDER BY t.updated_at DESC
    `;

    const result = await con.query(query, [userId]);
    const allItems = result.rows;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const overdue = [];
    const today = [];
    const in_progress = [];
    const waiting = [];
    const completed = [];

    for (const item of allItems) {
      if (item.is_terminal || item.current_state_code === "RESOLVED" || item.current_state_code === "CLOSED") {
        completed.push(item);
        continue;
      }

      const due = item.due_date ? new Date(item.due_date) : null;
      const slaDead = item.sla_deadline_at ? new Date(item.sla_deadline_at) : null;
      const isPastDue = (due && due < now) || (slaDead && slaDead < now) || item.sla_status === "BREACHED";

      if (isPastDue) {
        overdue.push(item);
      } else if (item.current_state_code === "WAITING_VERIFY" || item.current_state_code === "ON_HOLD_PENDING_PARTS") {
        waiting.push(item);
      } else if (item.current_state_code === "IN_PROGRESS") {
        in_progress.push(item);
      } else if ((due && due >= startOfToday && due <= endOfToday) || item.priority === "Urgent") {
        today.push(item);
      } else {
        in_progress.push(item);
      }
    }

    res.json({
      success: true,
      data: {
        total_count: allItems.length,
        buckets: {
          overdue,
          today,
          in_progress,
          waiting,
          completed,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/work-items/:id
 * Xem thông tin chi tiết một Work Item kèm lịch sử và các bước chuyển hợp lệ
 */
export const getWorkItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    const query = `
      SELECT 
        t.task_id AS id,
        COALESCE(t.work_item_type, 'TASK') AS type,
        t.name AS title,
        t.description,
        t.priority,
        t.due_date,
        t.start_date,
        t.version,
        t.workflow_id,
        t.current_state_id,
        t.department_id,
        d.name AS department_name,
        ws.code AS current_state_code,
        ws.name AS current_state_name,
        ws.color AS state_color,
        ws.is_terminal,
        si.status AS sla_status,
        si.deadline_at AS sla_deadline_at,
        si.paused_at AS sla_paused_at,
        u.name AS creator_name,
        u.email AS creator_email,
        u.avatar_url AS creator_avatar,
        t.created_at,
        t.updated_at
      FROM tasks t
      LEFT JOIN departments d ON t.department_id = d.department_id
      LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
      LEFT JOIN sla_instances si ON t.task_id = si.task_id
      LEFT JOIN users u ON t.created_by = u.user_id
      WHERE t.task_id = $1 AND t.deleted_at IS NULL
    `;
    const result = await con.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Không tìm thấy Work Item" });
    }
    const item = result.rows[0];

    // Lấy danh sách kỹ thuật viên / người được giao việc
    const assignsRes = await con.query(
      `SELECT u.user_id, u.name, u.email, u.avatar_url
       FROM task_assigns ta
       JOIN users u ON ta.user_id = u.user_id
       WHERE ta.task_id = $1 AND ta.deleted_at IS NULL`,
      [id]
    );

    // Lấy thông tin mở rộng của Incident nếu là INCIDENT
    let incidentDetails = null;
    if (item.type === "INCIDENT") {
      const incRes = await con.query(
        `SELECT inc.*, a.name AS asset_name, a.asset_code, a.location AS asset_location, a.health_score
         FROM incidents inc
         LEFT JOIN assets a ON inc.asset_id = a.asset_id
         WHERE inc.task_id = $1`,
        [id]
      );
      if (incRes.rows.length > 0) {
        incidentDetails = incRes.rows[0];
      }
    }

    // Lấy các bước chuyển hợp lệ cho user hiện tại
    const availableTransitions = await WorkflowEngine.getAvailableTransitions(
      id,
      await WorkflowEngine.getUserRolesForTask(userId, id)
    ).catch(() => []);

    // Lấy lịch sử Audit Trail (Activity Logs)
    const logsRes = await con.query(
      `SELECT al.*, u.name AS actor_name, u.email AS actor_email, u.avatar_url AS actor_avatar
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       WHERE al.task_id = $1
       ORDER BY al.created_at DESC LIMIT 20`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...item,
        assignees: assignsRes.rows,
        incident: incidentDetails,
        available_transitions: availableTransitions,
        activity_logs: logsRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/work-items
 * Tạo Work Item mới (Task, Incident, Request) per API Contract Matrix 2.2
 */
export const createWorkItem = async (req, res, next) => {
  try {
    const {
      title,
      name,
      description,
      work_item_type = "TASK",
      priority = "Normal",
      due_date,
      department_id,
      list_id,
      asset_id,
      symptom,
      evidence_urls,
    } = req.body;

    const itemTitle = title || name;
    if (!itemTitle) {
      return res.status(400).json({ success: false, message: "Tiêu đề (title hoặc name) là bắt buộc" });
    }

    const userId = req.user.user_id;

    if (work_item_type === "INCIDENT") {
      const incResult = await Incident.reportIncident({
        title: itemTitle,
        symptom: symptom || description || "Không có mô tả chi tiết",
        asset_id: asset_id || null,
        reported_by: userId,
        severity: priority === "Urgent" ? "CRITICAL" : priority === "High" ? "HIGH" : "MEDIUM",
        evidence_urls: evidence_urls || [],
        list_id: list_id || null,
      });

      return res.status(201).json({
        success: true,
        message: "Tạo sự cố (Work Item INCIDENT) thành công",
        data: incResult,
      });
    }

    // Với TASK hoặc REQUEST
    let targetListId = list_id;
    if (!targetListId) {
      const defaultListRes = await con.query(
        `SELECT list_id FROM lists WHERE deleted_at IS NULL ORDER BY list_id ASC LIMIT 1`
      );
      targetListId = defaultListRes.rows[0]?.list_id;
    }

    if (!targetListId) {
      return res.status(400).json({ success: false, message: "Không tìm thấy List phù hợp để tạo Work Item" });
    }

    const newTask = await createTaskForList({
      listId: targetListId,
      name: itemTitle,
      description,
      priority,
      due_date,
      created_by: userId,
      work_item_type,
      department_id,
    });

    res.status(201).json({
      success: true,
      message: `Tạo Work Item [${work_item_type}] thành công`,
      data: newTask,
    });
  } catch (error) {
    next(error);
  }
};
