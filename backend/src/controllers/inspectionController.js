import Inspection from "../models/Inspection.js";
import Asset from "../models/Asset.js";
import Department from "../models/Department.js";

export const getInspectionTemplates = async (req, res, next) => {
  try {
    const templates = await Inspection.getAllTemplates(req.workspaceId || null, req.userWorkspaceIds || []);
    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

export const getInspectionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Inspection.getById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mẫu kiểm tra này" });
    }
    if (item.asset_id) {
      const asset = await Asset.getById(item.asset_id);
      if (!asset?.workspace_id || !(req.userWorkspaceIds || []).includes(Number(asset.workspace_id))) {
        return res.status(403).json({ success: false, message: "Forbidden: Mẫu kiểm tra thuộc Workspace khác." });
      }
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getAssetChecklist = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const asset = await Asset.getById(assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị này" });
    }
    if (!asset.workspace_id || !(req.userWorkspaceIds || []).includes(Number(asset.workspace_id))) {
      return res.status(403).json({ success: false, message: "Forbidden: Thiết bị thuộc Workspace khác." });
    }
    const checklist = await Inspection.getChecklistByAsset(assetId);
    if (!checklist) {
      return res.status(404).json({ success: false, message: "Không tìm thấy checklist cho thiết bị này" });
    }
    res.json({ success: true, data: checklist });
  } catch (error) {
    next(error);
  }
};

export const submitInspection = async (req, res, next) => {
  try {
    const { assetId, checklistId, results } = req.body;
    if (!assetId || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: "assetId và danh sách results không được để trống",
      });
    }
    const asset = await Asset.getById(assetId);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị này" });
    }
    if (!asset.workspace_id || !(req.userWorkspaceIds || []).includes(Number(asset.workspace_id))) {
      return res.status(403).json({ success: false, message: "Forbidden: Thiết bị thuộc Workspace khác." });
    }

    const inspectorId = req.user?.user_id || null;
    const outcome = await Inspection.submitRun({
      assetId,
      checklistId,
      inspectorId,
      results,
    });

    res.json({
      success: true,
      message: outcome.overallStatus === "FAIL"
        ? `Kiểm tra hoàn tất: Có ${outcome.failedCount} hạng mục không đạt, hệ thống đã tự động tạo Sự cố mới!`
        : "Kiểm tra hoàn tất: Tất cả hạng mục đạt tiêu chuẩn (PASS)!",
      data: outcome,
    });
  } catch (error) {
    next(error);
  }
};

export const createInspectionTemplate = async (req, res, next) => {
  try {
    const { asset_id, title, description, items } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: "Tiêu đề mẫu checklist là bắt buộc" });
    }
    if (!asset_id) {
      return res.status(400).json({
        success: false,
        message: "Bắt buộc chọn thiết bị thuộc Workspace khi tạo mẫu checklist mới (tránh tạo mẫu dùng chung liên công ty).",
      });
    }
    const asset = await Asset.getById(asset_id);
    if (!asset || Number(asset.workspace_id) !== Number(req.workspaceId)) {
      return res.status(403).json({ success: false, message: "Forbidden: Thiết bị không thuộc Workspace bạn quản trị." });
    }
    const created = await Inspection.createTemplate({
      asset_id: Number(asset_id),
      title: String(title).trim(),
      description: description || "",
      items: Array.isArray(items) ? items : [],
    });
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateInspectionTemplate = async (req, res, next) => {
  try {
    const existing = await Inspection.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Không tìm thấy mẫu kiểm tra" });
    }
    if (!existing.asset_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Mẫu checklist hệ thống dùng chung ở chế độ chỉ đọc, không thể chỉnh sửa từ cấp Workspace.",
      });
    }
    const asset = await Asset.getById(existing.asset_id);
    if (!asset || Number(asset.workspace_id) !== Number(req.workspaceId)) {
      return res.status(403).json({ success: false, message: "Forbidden: Mẫu checklist thuộc Workspace khác." });
    }
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "asset_id")) {
      if (!req.body.asset_id) {
        return res.status(400).json({ success: false, message: "Không thể chuyển mẫu Workspace thành mẫu dùng chung toàn hệ thống." });
      }
      const nextAsset = await Asset.getById(req.body.asset_id);
      if (!nextAsset || Number(nextAsset.workspace_id) !== Number(req.workspaceId)) {
        return res.status(403).json({ success: false, message: "Forbidden: Không thể gắn thiết bị của Workspace khác." });
      }
    }
    const updated = await Inspection.updateTemplate(req.params.id, req.body || {});
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const getInspectionRuns = async (req, res, next) => {
  try {
    const workspaceId = req.workspaceId;
    const accessibleDeptIds = await Department.getAccessibleDepartmentIds(req.user.user_id, null, workspaceId);
    const runs = await Inspection.getRuns(req.query.limit || 50, workspaceId, accessibleDeptIds);
    res.json({ success: true, data: runs });
  } catch (error) {
    next(error);
  }
};
