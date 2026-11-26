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
import { assetWorkspace, requireAssetMember } from "../middlewares/roleMiddlewares.js";

const ownAsset = requireAssetMember((req) => assetWorkspace(req.params.assetId ?? req.body?.assetId));

const router = Router();

router.get("/templates", getInspectionTemplates);
router.get("/asset/:assetId/checklist", ownAsset, getAssetChecklist);
router.get("/assets/:assetId/checklist", ownAsset, getAssetChecklist);
router.get("/:id", getInspectionById);
router.post("/submit", ownAsset, submitInspection);
router.post("/:id/submit", ownAsset, submitInspection);

export default router;
