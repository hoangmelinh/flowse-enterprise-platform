import { Router } from "express";
import {
  getInspectionTemplates,
  getInspectionById,
  getAssetChecklist,
  submitInspection,
  createInspectionTemplate,
  updateInspectionTemplate,
  getInspectionRuns,
} from "../controllers/inspectionController.js";
import { assetWorkspace, requireAdmin, requireWorkspaceGovernance, resolveWorkspaceMembership } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/templates", resolveWorkspaceMembership, getInspectionTemplates);
router.post("/templates", requireAdmin((req) => assetWorkspace(req.body?.asset_id)), createInspectionTemplate);
router.put("/templates/:id", requireWorkspaceGovernance(["admin"], { requireExplicitWorkspace: true }), updateInspectionTemplate);
router.get("/runs", resolveWorkspaceMembership, requireWorkspaceGovernance(["admin", "manager"], { requireExplicitWorkspace: true }), getInspectionRuns);
router.get("/asset/:assetId/checklist", resolveWorkspaceMembership, getAssetChecklist);
router.get("/assets/:assetId/checklist", resolveWorkspaceMembership, getAssetChecklist);
router.get("/:id", resolveWorkspaceMembership, getInspectionById);
router.post("/submit", resolveWorkspaceMembership, submitInspection);
router.post("/:id/submit", resolveWorkspaceMembership, submitInspection);

export default router;
