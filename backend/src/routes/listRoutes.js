import express from "express";
import {
  getListsByFolder,
  getListsBySpace,
  getListById,
  createNewList,
  updateListById,
  deleteListById,
} from "../controllers/listController.js";

// Import Middleware Phân quyền
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

// GET all lists for a folder - Đọc không cần quyền đặc biệt
router.get("/folders/:folder_id", requireSpaceMembership, getListsByFolder);

// GET all lists for a space - Đọc không cần quyền đặc biệt
router.get("/spaces/:space_id", requireSpaceMembership, getListsBySpace);

// GET single list by ID - Đọc không cần quyền đặc biệt
router.get("/:list_id", requireSpaceMembership, getListById);

// POST create list -> Yêu cầu quyền: LIST_MANAGE (Admin + Manager)
router.post("/", requirePermission('LIST_MANAGE'), createNewList);

// PUT update list -> Yêu cầu quyền: LIST_MANAGE (Admin + Manager)
router.put("/:list_id", requirePermission('LIST_MANAGE'), updateListById);

// DELETE soft-delete list -> Yêu cầu quyền: LIST_MANAGE (Admin + Manager)
router.delete("/:list_id", requirePermission('LIST_MANAGE'), deleteListById);

export default router;
