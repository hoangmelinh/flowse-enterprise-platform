import express from 'express';
import {
  getStatusesByListId,
  getStatusesBySpaceId,
  createTaskStatus,
  getStatusById,
  updateTaskStatus,
  deleteTaskStatus,
  reorderStatus,
} from '../controllers/taskStatusController.js';
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

// ── Routes có prefix cụ thể (phải đặt TRƯỚC các route :param) ──

// Lấy tất cả status theo Space
router.get('/spaces/:spaceId', requireSpaceMembership, getStatusesBySpaceId);

// Tạo status trong Space → Yêu cầu quyền: SETTING_MANAGE (Admin + Manager)
router.post('/spaces/:spaceId', requirePermission('SETTING_MANAGE'), createTaskStatus);

// Lấy tất cả status theo List (thông qua join space_id)
router.get('/lists/:listId', requireSpaceMembership, getStatusesByListId);

// ── Routes với :statusId (generic param — đặt SAU) ──

// Reorder status → cần đặt trước GET/PUT/DELETE /:statusId vì match /:statusId/reorder
router.put('/:statusId/reorder', requirePermission('SETTING_MANAGE'), reorderStatus);

// Lấy status theo ID
router.get('/:statusId', requireSpaceMembership, getStatusById);

// Cập nhật status → Yêu cầu quyền: SETTING_MANAGE
router.put('/:statusId', requirePermission('SETTING_MANAGE'), updateTaskStatus);

// Xóa status → Yêu cầu quyền: SETTING_MANAGE
router.delete('/:statusId', requirePermission('SETTING_MANAGE'), deleteTaskStatus);

export default router;
