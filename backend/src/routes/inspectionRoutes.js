import { Router } from "express";
import { getAssetChecklist, submitInspection } from "../controllers/inspectionController.js";

const router = Router();

router.get("/asset/:assetId/checklist", getAssetChecklist);
router.post("/submit", submitInspection);

export default router;
