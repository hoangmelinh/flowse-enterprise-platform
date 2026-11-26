import Asset from "../models/Asset.js";
import Department from "../models/Department.js";

const canReadAssetInScope = async (req, asset) => {
  const userWsIds = req.userWorkspaceIds || [];
  if (!asset.workspace_id || !userWsIds.includes(Number(asset.workspace_id))) {
    return false;
  }
  if (!asset.department_id) return true;
  return await Department.isDepartmentInScope(req.user.user_id, asset.department_id, null, asset.workspace_id);
};

export const getAssets = async (req, res, next) => {
  try {
    const assets = await Asset.getAll(req.user, req.workspaceId || null, req.userWorkspaceIds || []);
    res.json({ success: true, data: assets });
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req, res, next) => {
  try {
    const asset = await Asset.getById(req.params.id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }
    if (!(await canReadAssetInScope(req, asset))) {
      return res.status(403).json({ success: false, message: "Forbidden: Thiết bị không thuộc phạm vi Workspace/Phòng ban của bạn." });
    }
    res.json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

export const resolveQrContext = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "QR token is required" });
    }

    const context = await Asset.resolveQrToken(token);
    if (!context) {
      return res.status(404).json({ success: false, message: "Asset not found for this QR token" });
    }
    if (!(await canReadAssetInScope(req, context.asset))) {
      return res.status(403).json({ success: false, message: "Forbidden: Mã QR thiết bị thuộc Workspace khác." });
    }

    res.json({
      success: true,
      message: "QR Context resolved successfully",
      data: context,
    });
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (req, res, next) => {
  try {
    const created = await Asset.create({ ...req.body, workspace_id: req.workspaceId });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req, res, next) => {
  try {
    const updated = await Asset.update(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 4 – Digital Health Record
 * GET /assets/:id/health-record
 */
export const getAssetHealthRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await Asset.getById(id);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }
    if (!(await canReadAssetInScope(req, asset))) {
      return res.status(403).json({ success: false, message: "Forbidden: Thiết bị không thuộc phạm vi Workspace/Phòng ban của bạn." });
    }
    const record = await Asset.getHealthRecord(id);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const rotateAssetQr = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await Asset.rotateQrToken(id, req.user?.user_id);
    res.json({
      success: true,
      message: "Đã cấp lại mã QR an toàn mới thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

