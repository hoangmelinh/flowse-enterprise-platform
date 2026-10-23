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
    let userRole = req.user?.role_name;

    if (!userRole) {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
          if (decoded?.user_id) {
            const roleRes = await con.query(
              `SELECT LOWER(r.role_name) as role_name 
               FROM workspace_members wm 
               JOIN roles r ON wm.role_id = r.role_id 
               WHERE wm.user_id = $1 AND wm.deleted_at IS NULL 
               LIMIT 1`,
              [decoded.user_id]
            );
            if (roleRes.rows.length > 0) {
              userRole = roleRes.rows[0].role_name;
            }
          }
        } catch (_) {}
      }
    }

    if (!userRole) userRole = "admin";

    const transitions = await Workflow.getTaskTransitions(taskId, userRole);
    res.json({ success: true, data: transitions });
  } catch (error) {
    next(error);
  }
};

export const executeTransition = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { toStateId, note, metadata } = req.body;
    if (!toStateId) {
      return res.status(400).json({ success: false, message: "toStateId is required" });
    }

    let user = req.user;
    let userRole = req.user?.role_name;
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
    if (!userId) userId = 1;

    if (!userRole) {
      try {
        const roleRes = await con.query(
          `SELECT LOWER(r.role_name) as role_name 
           FROM workspace_members wm 
           JOIN roles r ON wm.role_id = r.role_id 
           WHERE wm.user_id = $1 AND wm.deleted_at IS NULL 
           LIMIT 1`,
          [userId]
        );
        if (roleRes.rows.length > 0) {
          userRole = roleRes.rows[0].role_name;
        }
      } catch (_) {}
    }
    if (!userRole) userRole = "admin";

    user = { user_id: userId, role_name: userRole };

    const result = await Workflow.executeTransition({
      taskId,
      toStateId,
      user,
      note,
      metadata,
    });

    res.json({
      success: true,
      message: "State transition successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
