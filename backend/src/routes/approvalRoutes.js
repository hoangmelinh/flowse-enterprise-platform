import { Router } from "express";
import { getPendingApprovals, makeApprovalDecision } from "../controllers/approvalController.js";
import { requireManagerOrAdmin } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/pending", getPendingApprovals);
router.post("/:approvalId/decision", requireManagerOrAdmin, makeApprovalDecision);

export default router;

