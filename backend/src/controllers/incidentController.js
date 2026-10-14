import Incident from "../models/Incident.js";
import AIVisionService from "../services/aiVisionService.js";

export const getIncidents = async (req, res, next) => {
  try {
    const list = await Incident.getAll();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

export const getIncidentById = async (req, res, next) => {
  try {
    const item = await Incident.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Incident not found" });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const reportIncident = async (req, res, next) => {
  try {
    const { title, symptom, asset_id, severity, evidence_urls, list_id } = req.body;
    if (!title || !symptom) {
      return res.status(400).json({ success: false, message: "Tiêu đề và mô tả sự cố là bắt buộc." });
    }

    const created = await Incident.reportIncident({
      title,
      symptom,
      asset_id,
      reported_by: req.user.user_id,
      severity,
      evidence_urls,
      list_id,
    });

    res.status(201).json({
      success: true,
      message: "Báo cáo sự cố thành công",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const requestParts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { partName, quantity, reason } = req.body;
    if (!partName) {
      return res.status(400).json({ success: false, message: "Tên linh kiện/vật tư là bắt buộc." });
    }

    const result = await Incident.requestSpareParts({
      incidentId: id,
      partName,
      quantity: quantity || 1,
      reason: reason || "",
      requestedBy: req.user.user_id,
    });

    res.status(201).json({
      success: true,
      message: "Đã gửi đề xuất xin cấp linh kiện và chuyển sự cố sang Chờ linh kiện (Tạm dừng).",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const success = await Incident.deleteIncident(id);
    if (!success) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sự cố để xóa." });
    }
    res.json({
      success: true,
      message: "Đã xóa sự cố thành công.",
    });
  } catch (error) {
    next(error);
  }
};

export const getDowntimeStats = async (req, res, next) => {
  try {
    const { period = "month" } = req.query;
    const stats = await Incident.getDowntimeAndMTTRStats(period);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

export const cleanTestData = async (req, res, next) => {
  try {
    const result = await Incident.cleanTestData();
    res.json({ success: true, message: `Đã dọn dẹp ${result.cleanedCount} sự cố kiểm thử thành công.`, data: result });
  } catch (error) {
    next(error);
  }
};

export const analyzeEvidence = async (req, res, next) => {
  try {
    const { imageUrl, incidentTitle, assetName, symptom } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "Đường dẫn hình ảnh (imageUrl) là bắt buộc." });
    }
    const result = await AIVisionService.analyzeEvidence({ imageUrl, incidentTitle, assetName, symptom });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};


