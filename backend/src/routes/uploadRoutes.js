import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

// Cấu hình Multer để lưu file vào thư mục 'uploads'
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        // Tên file gốc nhưng loại bỏ khoảng trắng và thêm timestamp để tránh trùng lặp
        const originalName = file.originalname.replace(/\s+/g, '-');
        const timestamp = Date.now();
        cb(null, `${timestamp}-${originalName}`);
    }
});

const upload = multer({ storage });

// POST /api/v1/upload
router.post("/", upload.single("file"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Không tìm thấy file" });
        }
        
        // Trả về thông tin file vừa upload
        const fileUrl = `/uploads/${req.file.filename}`;
        
        return res.status(200).json({
            message: "Upload thành công",
            file: {
                file_name: req.file.originalname,
                file_url: fileUrl,
                file_size: req.file.size,
                mime_type: req.file.mimetype
            }
        });
    } catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({ error: "Lỗi server khi upload file" });
    }
});

export default router;
