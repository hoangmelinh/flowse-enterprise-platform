import { Router } from "express";
import {
  getWorkflows,
  getWorkflowById,
  getTaskTransitions,
  executeTransition,
} from "../controllers/workflowController.js";

const router = Router();

router.get("/", getWorkflows);
router.get("/:id", getWorkflowById);
router.get("/task/:taskId/transitions", getTaskTransitions);
router.post("/task/:taskId/transition", executeTransition);

export default router;
