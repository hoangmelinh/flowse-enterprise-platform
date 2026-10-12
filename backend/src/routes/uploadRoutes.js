import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const router = express.Router();

// Đảm bảo thư mục uploads tồn tại
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer lưu trữ tạm thời trong memory để tối ưu nén ảnh trước khi ghi vào đĩa
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // Giới hạn tối đa 50MB
    }
});

// POST /api/v1/upload
router.post("/", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Không tìm thấy file" });
        }

        const timestamp = Date.now();
        const originalName = req.file.originalname.replace(/\s+/g, '-');
        const ext = path.extname(originalName).toLowerCase();
        const baseName = path.basename(originalName, ext);

        let finalFileName = `${timestamp}-${originalName}`;
        let finalFilePath = path.join(UPLOAD_DIR, finalFileName);
        let finalMimeType = req.file.mimetype;
        let finalSize = req.file.size;
        let wasCompressed = false;

        // Nếu là ảnh (jpeg, png, webp) -> Tự động nén và resize tối ưu dung lượng
        const isImage = req.file.mimetype.startsWith("image/") && !req.file.mimetype.includes("svg");

        if (isImage) {
            try {
                // Xuất ra định dạng WebP với chất lượng 80% (tiết kiệm 75-90% dung lượng đĩa)
                finalFileName = `${timestamp}-${baseName}.webp`;
                finalFilePath = path.join(UPLOAD_DIR, finalFileName);
                finalMimeType = "image/webp";

                const compressedBuffer = await sharp(req.file.buffer)
                    .resize({
                        width: 1920,
                        height: 1920,
                        fit: "inside",
                        withoutEnlargement: true
                    })
                    .webp({ quality: 80, effort: 4 })
                    .toBuffer();

                await fs.promises.writeFile(finalFilePath, compressedBuffer);
                finalSize = compressedBuffer.length;
                wasCompressed = true;
            } catch (sharpError) {
                console.warn("[Upload] Sharp compression fallback:", sharpError.message);
                // Fallback: Nếu ảnh lỗi định dạng, lưu buffer gốc
                finalFileName = `${timestamp}-${originalName}`;
                finalFilePath = path.join(UPLOAD_DIR, finalFileName);
                finalMimeType = req.file.mimetype;
                await fs.promises.writeFile(finalFilePath, req.file.buffer);
                finalSize = req.file.size;
            }
        } else {
            // Đối với video, audio, tài liệu pdf/doc -> Lưu trực tiếp
            await fs.promises.writeFile(finalFilePath, req.file.buffer);
        }

        const fileUrl = `/uploads/${finalFileName}`;

        return res.status(200).json({
            message: "Upload thành công",
            file: {
                file_name: finalFileName,
                file_url: fileUrl,
                file_size: finalSize,
                mime_type: finalMimeType,
                compressed: wasCompressed
            }
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ error: "Lỗi server khi upload file" });
    }
});

export default router;
