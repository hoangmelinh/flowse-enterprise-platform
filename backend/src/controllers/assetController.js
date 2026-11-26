import Groq from "groq-sdk";
import Asset from "../models/Asset.js";
import { explainAssetHistory, repairHistory } from "../services/assetInsightService.js";

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

/**
 * POST /assets/:id/ai-insight { symptom? }: quét QR xong hỏi "máy này hay hỏng gì, vì sao, sửa thế nào".
 * Chưa có lần sửa nào ghi nguyên nhân thì trả "chưa đủ dữ liệu" mà không cần AI.
 */
export const explainAsset = async (req, res, next) => {
  try {
    const record = await Asset.getHealthRecord(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị." });
    const symptom = typeof req.body?.symptom === "string" ? req.body.symptom : "";
    if (!groq && repairHistory(record).length) {
      return res.status(503).json({ success: false, message: "Flowse AI chưa được cấu hình (thiếu GROQ_API_KEY)." });
    }
    res.json({ success: true, data: await explainAssetHistory(groq, record, symptom) });
  } catch (error) {
    // Lỗi từ Groq (có status) không lộ chi tiết ra ngoài
    if (error?.status && !error.statusCode) {
      console.warn("[ai-insight] Groq lỗi:", error.message);
      return res.status(502).json({ success: false, message: "Flowse AI đang bận, thử lại sau ít phút." });
    }
    next(error);
  }
};

export const getAssets = async (req, res, next) => {
  try {
    const assets = await Asset.getAll(req.user);
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

/**
 * Phase 4 – Digital Health Record
 * GET /assets/:id/health-record
 */
export const getAssetHealthRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await Asset.getHealthRecord(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }
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

