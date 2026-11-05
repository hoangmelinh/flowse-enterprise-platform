import { Router } from "express";
import { getPendingApprovals, makeApprovalDecision } from "../controllers/approvalController.js";
import { requireTaskManager, taskOfApproval } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/pending", getPendingApprovals);
router.post("/:approvalId/decision", requireTaskManager(taskOfApproval), makeApprovalDecision);

export default router;

