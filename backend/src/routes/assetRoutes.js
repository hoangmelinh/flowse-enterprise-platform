import { Router } from "express";
import {
  getAssets,
  getAssetById,
  resolveQrContext,
  createAsset,
  getAssetHealthRecord,
} from "../controllers/assetController.js";
import { requireAdmin } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/resolve", resolveQrContext);
router.get("/", getAssets);
router.get("/:id/health-record", getAssetHealthRecord);
router.get("/:id", getAssetById);
router.post("/", requireAdmin, createAsset);

export default router;
