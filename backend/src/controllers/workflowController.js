import Workflow from "../models/Workflow.js";

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
    const userRole = req.user?.role_name || "member";
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

    const result = await Workflow.executeTransition({
      taskId,
      toStateId,
      user: req.user,
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
