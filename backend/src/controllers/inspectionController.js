import Inspection from "../models/Inspection.js";

export const getAssetChecklist = async (req, res, next) => {
  try {
    const { assetId } = req.params;
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
