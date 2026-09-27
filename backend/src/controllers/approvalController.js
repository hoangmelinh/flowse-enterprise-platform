import Approval from "../models/Approval.js";

export const getPendingApprovals = async (req, res, next) => {
  try {
    const list = await Approval.getPendingApprovals(req.user.user_id);
    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};

export const makeApprovalDecision = async (req, res, next) => {
  try {
    const { approvalId } = req.params;
    const { status, decisionNote } = req.body;

    const result = await Approval.makeDecision({
      approvalId,
      approverId: req.user.user_id,
      status,
      decisionNote,
    });

    res.json({
      success: true,
      message: `Approval has been ${status.toLowerCase()}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
