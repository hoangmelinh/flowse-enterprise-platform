import Incident from "../models/Incident.js";
import AIVisionService from "../services/aiVisionService.js";

export const getIncidents = async (req, res, next) => {
  try {
    const list = await Incident.getAll(req.user);
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

export const reopenIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await Incident.reopenIncident({
      incidentId: id,
      userId: req.user.user_id,
      reason: reason || "Máy tái phát lỗi sau sửa chữa",
    });
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const assignTechnician = async (req, res, next) => {
  try {
    const { id } = req.params;
    const technician_id = req.body.technician_id || req.body.technicianId;
    if (!technician_id) {
      return res.status(400).json({ success: false, message: "technician_id là bắt buộc." });
    }
    const result = await Incident.assignTechnician({
      incidentId: id,
      technicianId: technician_id,
      assignedBy: req.user.user_id,
    });
    res.json({
      success: true,
      message: "Đã phân công Kỹ thuật viên thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const appendEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const evidence_urls = req.body.evidence_urls || req.body.evidenceUrls || [];
    const is_resolved_evidence = req.body.is_resolved_evidence || req.body.isResolvedEvidence;
    const result = await Incident.appendEvidence({
      incidentId: id,
      evidenceUrls: Array.isArray(evidence_urls) ? evidence_urls : [evidence_urls],
      uploadedBy: req.user.user_id,
      isResolvedEvidence: !!is_resolved_evidence,
    });
    res.json({
      success: true,
      message: "Đã tải lên bằng chứng thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};



