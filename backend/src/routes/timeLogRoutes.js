import express from 'express';
import {
    getTimeLogsByTaskId,
    getMyTimeLogs,
    getRunningTimer,
    startTimerForTask,
    stopTimerById,
    deleteTimeLogById,
    getTotalTime,
} from '../controllers/timeLogController.js';
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

router.get('/me', getMyTimeLogs);
router.get('/running', getRunningTimer);
router.get('/tasks/:taskId', requireSpaceMembership, getTimeLogsByTaskId);
router.get('/tasks/:taskId/total', requireSpaceMembership, getTotalTime);

// allowNoSpace: task trên TimeTrackingPage có thể không thuộc space nào
router.post('/tasks/:taskId/start', requirePermission('TIME_LOG_ADD', { allowNoSpace: true }), startTimerForTask);
router.put('/:timeLogId/stop',      requirePermission('TIME_LOG_ADD', { allowNoSpace: true }), stopTimerById);
router.delete('/:timeLogId',        requirePermission('TIME_LOG_ADD', { allowNoSpace: true }), deleteTimeLogById);

export default router;
