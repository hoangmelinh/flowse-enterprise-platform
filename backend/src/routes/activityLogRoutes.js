import express from 'express';
import {
  getActivitiesByTaskId,
  getMyActivities,
  getActivitiesBySpaceId,
  getActivitiesByWorkspaceId,
} from '../controllers/activityLogController.js';
import { requireSpaceMembership, requireWorkspaceMembership } from '../middlewares/membershipMiddleware.js';
import { requireWorkspaceGovernance } from '../middlewares/roleMiddlewares.js';

const router = express.Router();
router.get('/me', getMyActivities);
router.get('/workspace/:workspaceId', requireWorkspaceMembership, requireWorkspaceGovernance(['admin', 'manager']), getActivitiesByWorkspaceId);
router.get('/spaces/:spaceId', requireSpaceMembership, getActivitiesBySpaceId);
router.get('/tasks/:taskId', requireSpaceMembership, getActivitiesByTaskId);

export default router;
