import { Router } from "express";
import {
  getWorkflows,
  getWorkflowById,
  getTaskTransitions,
  executeTransition,
} from "../controllers/workflowController.js";

const router = Router();

router.get("/", getWorkflows);
router.get("/task/:taskId/transitions", getTaskTransitions);
router.get("/tasks/:taskId/transitions", getTaskTransitions);
router.get("/:taskId/transitions", getTaskTransitions);
router.post("/task/:taskId/transition", executeTransition);
router.post("/tasks/:taskId/transition", executeTransition);
router.post("/task/:taskId/transitions", executeTransition);
router.post("/tasks/:taskId/transitions", executeTransition);
router.post("/:taskId/transition", executeTransition);
router.get("/:id", getWorkflowById);

export default router;
