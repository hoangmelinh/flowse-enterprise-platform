import { Router } from "express";
import {
  getAssets,
  getAssetById,
  resolveQrContext,
  createAsset,
  getAssetHealthRecord,
  rotateAssetQr,
  explainAsset,
} from "../controllers/assetController.js";
import { assetWorkspace, assetWorkspaceByQr, departmentWorkspace, requireAdmin, requireAssetMember } from "../middlewares/roleMiddlewares.js";
import { aiChatLimiter } from "../middlewares/rateLimitMiddleware.js";

// Thiết bị chỉ hiện với thành viên công ty sở hữu nó
const ownAsset = requireAssetMember((req) => assetWorkspace(req.params.id));

const router = Router();

router.get("/resolve", requireAssetMember((req) => assetWorkspaceByQr(req.query.token)), resolveQrContext);
router.get("/", getAssets);
router.get("/:id/health-record", ownAsset, getAssetHealthRecord);
router.get("/:id", ownAsset, getAssetById);
router.post("/:id/ai-insight", ownAsset, aiChatLimiter, explainAsset);
router.post("/:id/rotate-qr", requireAdmin((req) => assetWorkspace(req.params.id)), rotateAssetQr);
router.post("/", requireAdmin((req) => departmentWorkspace(req.body?.department_id)), createAsset);

export default router;
