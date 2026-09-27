import express from "express";
import {
  getMilestonesBySpaceId,
  getMilestonesByListId,
  createMilestone,
  createMilestoneForList,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
} from "../controllers/milestonesController.js";

// Import Middleware Phân quyền
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

router.get("/lists/:listId/milestones", requireSpaceMembership, getMilestonesByListId);

router.get("/spaces/:spaceId/milestones", requireSpaceMembership, getMilestonesBySpaceId);

router.post("/lists/:listId/milestones", requirePermission('TASK_CREATE'), createMilestoneForList);

// Tạo milestone -> Yêu cầu quyền: SETTING_MANAGE (Admin + Manager)
router.post("/spaces/:spaceId/milestones", requirePermission('SETTING_MANAGE'), createMilestone);

router.get("/:milestoneId", requireSpaceMembership, getMilestoneById);


// Cập nhật milestone trong list -> yêu cầu quyền sửa task
router.put("/:milestoneId", requirePermission('TASK_UPDATE'), updateMilestone);

// Xóa milestone trong list -> yêu cầu quyền xóa task
router.delete("/:milestoneId", requirePermission('TASK_DELETE'), deleteMilestone);

export default router;
