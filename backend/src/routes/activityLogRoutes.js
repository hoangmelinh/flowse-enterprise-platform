import express from 'express';
import {
  getActivitiesByTaskId,
  getMyActivities,
  getActivitiesBySpaceId,
} from '../controllers/activityLogController.js';
import { requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();
router.get('/me', getMyActivities);
router.get('/spaces/:spaceId', requireSpaceMembership, getActivitiesBySpaceId);
router.get('/tasks/:taskId', requireSpaceMembership, getActivitiesByTaskId);

export default router;
