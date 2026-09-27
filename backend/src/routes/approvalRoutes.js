import { Router } from "express";
import { getPendingApprovals, makeApprovalDecision } from "../controllers/approvalController.js";

const router = Router();

router.get("/pending", getPendingApprovals);
router.post("/:approvalId/decision", makeApprovalDecision);

export default router;
