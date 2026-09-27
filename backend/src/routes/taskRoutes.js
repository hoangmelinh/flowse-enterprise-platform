import express from 'express';
import {
    getTasksByListId,
    createTasks,
    createTasksForList,
    getTaskById,
    updateTasks,
    deleteTasks,
    getCommentsByTaskIds,
    createComments,
    getAttachmentsByTaskIds,
    createAttachments,
    deleteAttachments,
    addAssigneeToTasks,
    removeAssigneeFromTasks,
    getTasksByUserId,
    getTasksBySprintId,
    shareTask,
    getShareableUsersForTask,
} from '../controllers/taskController.js';

// Import Middleware Phân quyền
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

/**
 * 1. CÁC API ĐỌC/XEM DỮ LIỆU (GET) — Yêu cầu membership trong Space
 */
router.get('/lists/:listId', requireSpaceMembership, getTasksByListId);
router.get('/spaces/:spaceId/sprints/:sprintId', requireSpaceMembership, getTasksBySprintId);
router.get('/my-tasks', getTasksByUserId);
router.get('/:taskId', requireSpaceMembership, getTaskById);
router.get('/:taskId/comments', requireSpaceMembership, getCommentsByTaskIds);
router.get('/:taskId/attachments', requireSpaceMembership, getAttachmentsByTaskIds);

/**
 * 2. CÁC API THAO TÁC TRÊN TASK
 */
// Tạo Task trong Space -> Yêu cầu quyền: TASK_CREATE
router.post('/spaces/:spaceId', requirePermission('TASK_CREATE'), createTasks);

// Tạo Task trong List -> Yêu cầu quyền: TASK_CREATE
router.post('/lists/:listId', requirePermission('TASK_CREATE'), createTasksForList);

// Cập nhật Task (Sửa tên, mô tả...) -> Yêu cầu quyền: TASK_UPDATE
router.put('/:taskId', requirePermission('TASK_UPDATE'), updateTasks);

// Xóa Task -> Yêu cầu quyền cực cao: TASK_DELETE (Chỉ Manager/Admin mới có)
router.delete('/:taskId', requirePermission('TASK_DELETE'), deleteTasks);

/**
 * 3. CÁC API TƯƠNG TÁC (Comment, Attachment)
 */
// Bình luận vào Task -> Yêu cầu quyền: COMMENT_CREATE
router.post('/:taskId/comments', requirePermission('COMMENT_CREATE'), createComments);

// Thêm file đính kèm -> Yêu cầu quyền: ATTACHMENT_ADD
router.post('/:taskId/attachments', requirePermission('ATTACHMENT_ADD'), createAttachments);

// Xóa file đính kèm -> Yêu cầu quyền: TASK_UPDATE (Người có quyền sửa task mới được xóa file)
router.delete('/attachments/:attachmentId', requirePermission('TASK_UPDATE'), deleteAttachments);

/**
 * 4. CÁC API PHÂN CÔNG CÔNG VIỆC (Assignee)
 */
// Thêm người phụ trách -> Yêu cầu quyền: TASK_ASSIGN
router.post('/:taskId/assignees', requirePermission('TASK_ASSIGN'), addAssigneeToTasks);

// Gỡ người phụ trách -> Yêu cầu quyền: TASK_ASSIGN
router.delete('/:taskId/assignees/:userId', requirePermission('TASK_ASSIGN'), removeAssigneeFromTasks);

/**
 * 5. CÁC API CHIA SẺ TASK (Share)
 */
// Lấy danh sách user có thể share — Yêu cầu membership
router.get('/:taskId/shareable-users', requireSpaceMembership, getShareableUsersForTask);

// Chia sẻ task cho nhiều user -> Yêu cầu quyền: TASK_ASSIGN
router.post('/:taskId/share', requirePermission('TASK_ASSIGN'), shareTask);

export default router;