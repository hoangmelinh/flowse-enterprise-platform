import { Router } from "express";
import {
  getAssets,
  getAssetById,
  resolveQrContext,
  createAsset,
  updateAsset,
  getAssetHealthRecord,
  rotateAssetQr,
} from "../controllers/assetController.js";
import { assetWorkspace, departmentWorkspace, requireAdmin, resolveWorkspaceMembership } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/resolve", resolveWorkspaceMembership, resolveQrContext);
router.get("/", resolveWorkspaceMembership, getAssets);
router.get("/:id/health-record", resolveWorkspaceMembership, getAssetHealthRecord);
router.get("/:id", resolveWorkspaceMembership, getAssetById);
router.post("/:id/rotate-qr", requireAdmin((req) => assetWorkspace(req.params.id)), rotateAssetQr);
router.put("/:id", requireAdmin((req) => assetWorkspace(req.params.id)), updateAsset);
router.post("/", requireAdmin((req) => departmentWorkspace(req.body?.department_id)), createAsset);

export default router;
