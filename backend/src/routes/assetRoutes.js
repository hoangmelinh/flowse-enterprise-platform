import { Router } from "express";
import {
  getAssets,
  getAssetById,
  resolveQrContext,
  createAsset,
  updateAsset,
  getAssetHealthRecord,
  rotateAssetQr,
  explainAsset,
} from "../controllers/assetController.js";
import { assetWorkspace, ashttps://github.com/hoangmelinh/flowse-enterprise-platform/pull/9/conflict?name=backend%252Fsrc%252Froutes%252FassetRoutes.js&ancestor_oid=862a748bbfffe98ceb49f043839acd0183b09d53&base_oid=1b25e519dac49ba156e2db44d967dd2d7065849b&head_oid=cdf3e26d35d1933abe4eedc15aee7bfbb70f937asetWorkspaceByQr, departmentWorkspace, requireAdmin, requireAssetMember } from "../middlewares/roleMiddlewares.js";
import { aiChatLimiter } from "../middlewares/rateLimitMiddleware.js";

// Thiết bị chỉ hiện với thành viên công ty sở hữu nó
const ownAsset = requireAssetMember((req) => assetWorkspace(req.params.id));

const router = Router();

router.get("/resolve", requireAssetMember((req) => assetWorkspaceByQr(req.query.token, req.query.code)), resolveQrContext);
router.get("/", getAssets);
router.get("/:id/health-record", ownAsset, getAssetHealthRecord);
router.get("/:id", ownAsset, getAssetById);
router.post("/:id/ai-insight", ownAsset, aiChatLimiter, explainAsset);
router.post("/:id/rotate-qr", requireAdmin((req) => assetWorkspace(req.params.id)), rotateAssetQr);
router.put("/:id", requireAdmin((req) => assetWorkspace(req.params.id)), updateAsset);
router.post("/", requireAdmin((req) => departmentWorkspace(req.body?.department_id)), createAsset);

export default router;
