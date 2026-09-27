import express from "express";
import {
  getSprintsBySpaceId,
  createSprint,
  getSprintById,
  updateSprint,
  deleteSprint,
} from "../controllers/sprintController.js";

// Import Middleware Phân quyền
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();



router.get("/spaces/:spaceId/sprints", requireSpaceMembership, getSprintsBySpaceId);


// Tạo sprint -> Yêu cầu quyền: SETTING_MANAGE (Admin + Manager)
router.post("/spaces/:spaceId/sprints", requirePermission('SETTING_MANAGE'), createSprint);



router.get("/:sprintId", requireSpaceMembership, getSprintById);


// Cập nhật sprint -> Yêu cầu quyền: SETTING_MANAGE (Admin + Manager)
router.put("/:sprintId", requirePermission('SETTING_MANAGE'), updateSprint);



// Xóa sprint -> Yêu cầu quyền: SETTING_MANAGE (Admin + Manager)
router.delete("/:sprintId", requirePermission('SETTING_MANAGE'), deleteSprint);

export default router;
