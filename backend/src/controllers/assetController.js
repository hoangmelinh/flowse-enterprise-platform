import Asset from "../models/Asset.js";

export const getAssets = async (req, res, next) => {
  try {
    const assets = await Asset.getAll();
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
    const created = await Asset.create(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};
