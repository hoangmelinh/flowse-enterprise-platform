import express from "express";
import {
  getFoldersBySpace,
  getFolderById,
  createNewFolder,
  updateFolderById,
  deleteFolderById,
} from "../controllers/folderController.js";

// Import Middleware Phân quyền
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

// GET all folders for a space (with nested lists) - Đọc không cần quyền đặc biệt
router.get("/spaces/:space_id", requireSpaceMembership, getFoldersBySpace);

// GET single folder by ID - Đọc không cần quyền đặc biệt
router.get("/:folder_id", requireSpaceMembership, getFolderById);

// POST create folder in a space -> Yêu cầu quyền: FOLDER_MANAGE (Admin + Manager)
router.post("/spaces/:space_id", requirePermission('FOLDER_MANAGE'), createNewFolder);

// PUT update folder -> Yêu cầu quyền: FOLDER_MANAGE (Admin + Manager)
router.put("/:folder_id", requirePermission('FOLDER_MANAGE'), updateFolderById);

// DELETE soft-delete folder -> Yêu cầu quyền: FOLDER_MANAGE (Admin + Manager)
router.delete("/:folder_id", requirePermission('FOLDER_MANAGE'), deleteFolderById);

export default router;
