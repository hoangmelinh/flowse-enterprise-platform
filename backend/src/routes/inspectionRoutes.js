import { Router } from "express";
import {
  getInspectionTemplates,
  getInspectionById,
  getAssetChecklist,
  submitInspection,
} from "../controllers/inspectionController.js";

const router = Router();

router.get("/templates", getInspectionTemplates);
router.get("/asset/:assetId/checklist", getAssetChecklist);
router.get("/assets/:assetId/checklist", getAssetChecklist);
router.get("/:id", getInspectionById);
router.post("/submit", submitInspection);
router.post("/:id/submit", submitInspection);

export default router;
