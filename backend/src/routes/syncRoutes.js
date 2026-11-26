import { Router } from "express";
import { handleBatchSync, getSyncLogs } from "../controllers/syncController.js";
import { requireWorkspaceGovernance } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/logs", requireWorkspaceGovernance(["admin", "manager"], { requireExplicitWorkspace: true }), getSyncLogs);
router.post("/batch", handleBatchSync);

export default router;
