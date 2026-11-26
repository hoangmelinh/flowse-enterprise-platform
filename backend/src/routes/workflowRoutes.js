import { Router } from "express";
import {
  getWorkflows,
  getWorkflowById,
  getTaskTransitions,
  executeTransition,
  createWorkflowDefinition,
  createWorkflowState,
  updateWorkflowState,
  createWorkflowTransition,
  updateWorkflowTransition,
  deleteWorkflowTransition,
  getSlaConfigs,
  saveSlaConfig,
} from "../controllers/workflowController.js";
import { requireWorkspaceGovernance, resolveWorkspaceMembership } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/sla-configs", requireWorkspaceGovernance(["admin", "manager"], { requireExplicitWorkspace: true }), getSlaConfigs);
router.post("/sla-configs", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), saveSlaConfig);
router.put("/sla-configs/:id", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), saveSlaConfig);

router.get("/", resolveWorkspaceMembership, getWorkflows);
router.post("/", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), createWorkflowDefinition);
router.post("/:id/states", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), createWorkflowState);
router.put("/states/:stateId", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), updateWorkflowState);
router.post("/:id/transitions", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), createWorkflowTransition);
router.put("/transitions/:transitionId", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), updateWorkflowTransition);
router.delete("/transitions/:transitionId", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), deleteWorkflowTransition);

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
