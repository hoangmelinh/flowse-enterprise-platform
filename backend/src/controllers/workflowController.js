import Workflow from "../models/Workflow.js";
import jwt from "jsonwebtoken";
import con from "../config/connect.js";

export const getWorkflows = async (req, res, next) => {
  try {
    const list = await Workflow.list();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

export const getWorkflowById = async (req, res, next) => {
  try {
    const details = await Workflow.getDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ success: false, message: "Workflow not found" });
    }
    res.json({ success: true, data: details });
  } catch (error) {
    next(error);
  }
};

export const getTaskTransitions = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    let userId = req.user?.user_id;

    if (!userId) {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
          if (decoded?.user_id) {
            userId = decoded.user_id;
          }
        } catch (_) {}
      }
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Chưa xác thực. Vui lòng đăng nhập." });
    }

    // Lấy toàn bộ vai trò hệ thống & vai trò ngữ cảnh (Contextual Roles) của user với Task này
    const userRoles = await Workflow.getUserRolesForTask(userId, taskId);

    const transitions = await Workflow.getTaskTransitions(taskId, userRoles);
    res.json({ success: true, data: transitions });
  } catch (error) {
    next(error);
  }
};

export const executeTransition = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    let targetStateId = req.body.toStateId || req.body.to_state_id;
    const note = req.body.note || req.body.reason || "";
    const metadata = req.body.metadata || {};

    if (!targetStateId && (req.body.transition_id || req.body.transitionId)) {
      const transId = req.body.transition_id || req.body.transitionId;
      const tRes = await con.query(
        "SELECT to_state_id FROM workflow_transitions WHERE transition_id = $1",
        [transId]
      );
      targetStateId = tRes.rows[0]?.to_state_id;
    }

    if (!targetStateId) {
      return res.status(400).json({ success: false, message: "toStateId hoặc transition_id là bắt buộc" });
    }

    let userId = req.user?.user_id;

    if (!userId) {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
          if (decoded?.user_id) {
            userId = decoded.user_id;
          }
        } catch (_) {}
      }
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Chưa xác thực. Vui lòng đăng nhập." });
    }

    // Lấy toàn bộ vai trò hệ thống & ngữ cảnh của user đối với Task này
    const userRoles = await Workflow.getUserRolesForTask(userId, taskId);

    const user = {
      user_id: userId,
      name: req.user?.name,
      roles: userRoles,
    };

    const result = await Workflow.executeTransition({
      taskId,
      toStateId: targetStateId,
      user,
      note,
      metadata,
      baseVersion: req.body.base_version ?? req.body.baseVersion ?? null,
    });

    res.json({
      success: true,
      message: "Chuyển trạng thái quy trình thành công",
      data: {
        ...result,
        to_state_code: result.current_state,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createWorkflowDefinition = async (req, res, next) => {
  try {
    const { name, code, description } = req.body || {};
    if (!name || !code) {
      return res.status(400).json({ success: false, message: "name và code là bắt buộc" });
    }
    const created = await Workflow.createDefinition({ name, code: String(code).toUpperCase(), description });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const createWorkflowState = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, color, is_initial, is_terminal, position } = req.body || {};
    if (!code || !name) {
      return res.status(400).json({ success: false, message: "code và name là bắt buộc" });
    }
    const created = await Workflow.createState(id, {
      code: String(code).toUpperCase(),
      name,
      color,
      is_initial,
      is_terminal,
      position,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateWorkflowState = async (req, res, next) => {
  try {
    const updated = await Workflow.updateState(req.params.stateId, req.body || {});
    if (!updated) return res.status(404).json({ success: false, message: "State not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const createWorkflowTransition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { from_state_id, to_state_id, transition_name, allowed_roles, required_fields, requires_approval, trigger_action } = req.body || {};
    if (!from_state_id || !to_state_id || !transition_name) {
      return res.status(400).json({ success: false, message: "from_state_id, to_state_id và transition_name là bắt buộc" });
    }
    const created = await Workflow.createTransition(id, {
      from_state_id,
      to_state_id,
      transition_name,
      allowed_roles,
      required_fields,
      requires_approval,
      trigger_action,
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateWorkflowTransition = async (req, res, next) => {
  try {
    const updated = await Workflow.updateTransition(req.params.transitionId, req.body || {});
    if (!updated) return res.status(404).json({ success: false, message: "Transition not found" });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkflowTransition = async (req, res, next) => {
  try {
    const deleted = await Workflow.deleteTransition(req.params.transitionId);
    if (!deleted) return res.status(404).json({ success: false, message: "Transition not found" });
    res.json({ success: true, data: deleted });
  } catch (error) {
    next(error);
  }
};

export const getSlaConfigs = async (_req, res, next) => {
  try {
    const configs = await Workflow.getSlaConfigs();
    res.json({ success: true, data: configs });
  } catch (error) {
    next(error);
  }
};

export const saveSlaConfig = async (req, res, next) => {
  try {
    const config = await Workflow.upsertSlaConfig({
      sla_config_id: req.params.id ? Number(req.params.id) : undefined,
      ...(req.body || {}),
    });
    if (!config) return res.status(404).json({ success: false, message: "SLA config not found" });
    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};
