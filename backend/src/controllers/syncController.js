import Sync from "../models/Sync.js";
import Department from "../models/Department.js";

export const handleBatchSync = async (req, res, next) => {
  try {
    const { actions } = req.body;
    if (!Array.isArray(actions)) {
      return res.status(400).json({ success: false, message: "actions must be an array" });
    }

    const results = await Sync.processBatchSync(req.user.user_id, actions);
    res.json({
      success: true,
      message: "Batch sync processed",
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const getSyncLogs = async (req, res, next) => {
  try {
    const wsId = req.workspaceId || (req.query.workspaceId ? Number(req.query.workspaceId) : null);
    const accessibleDeptIds = wsId
      ? await Department.getAccessibleDepartmentIds(req.user.user_id, req.workspaceRole || null, wsId)
      : null;
    const logs = await Sync.getLogs({
      workspaceId: wsId,
      limit: req.query.limit || 50,
      accessibleDeptIds,
      viewerUserId: req.user?.user_id || null,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};
