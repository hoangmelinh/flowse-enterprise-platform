import Sync from "../models/Sync.js";

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
