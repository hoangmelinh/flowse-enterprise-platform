import { Router } from "express";
import {
  getAssets,
  getAssetById,
  resolveQrContext,
  createAsset,
  getAssetHealthRecord,
  rotateAssetQr,
} from "../controllers/assetController.js";
import { assetWorkspace, departmentWorkspace, requireAdmin } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/resolve", resolveQrContext);
router.get("/", getAssets);
router.get("/:id/health-record", getAssetHealthRecord);
router.get("/:id", getAssetById);
router.post("/:id/rotate-qr", requireAdmin((req) => assetWorkspace(req.params.id)), rotateAssetQr);
router.post("/", requireAdmin((req) => departmentWorkspace(req.body?.department_id)), createAsset);

export default router;
