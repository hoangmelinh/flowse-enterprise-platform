import express from "express";
import {
  getWorkspaces,
  createWorkspaces,
  getWorkspaceById,
  updateWorkspaces,
  deleteWorkspaces,
  getWorkspaceMembers,
  getRolesMatrix,
  getWorkspaceInvitations,
  patchWorkspaceMember,
  getWorkspaceOperationsOverview,
} from "../controllers/workspacesControllers.js";

import { requirePermission, requireWorkspaceGovernance } from '../middlewares/roleMiddlewares.js';
import { requireWorkspaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

router.get("/roles/matrix", getRolesMatrix);
router.get("/", getWorkspaces);

// Ai cũng có thể tạo Workspace mới (không cần permission check)
router.post("/", createWorkspaces);


router.get("/:workspaceId", requireWorkspaceMembership, getWorkspaceById);
router.get(
  "/:workspaceId/operations-overview",
  requireWorkspaceMembership,
  requireWorkspaceGovernance(["admin", "manager"]),
  getWorkspaceOperationsOverview
);

// Chỉ Admin mới được cập nhật Workspace
router.put("/:workspaceId", requirePermission('WORKSPACE_UPDATE'), updateWorkspaces);

// Chỉ Admin mới được xóa Workspace
router.delete("/:workspaceId", requirePermission('WORKSPACE_DELETE'), deleteWorkspaces);

// --- Members & Invitations ---
router.get("/:workspaceId/members", requireWorkspaceMembership, getWorkspaceMembers);
router.patch("/:workspaceId/members/:userId", requirePermission('WORKSPACE_MANAGE_ROLES'), patchWorkspaceMember);
router.get("/:workspaceId/invitations", requirePermission('WORKSPACE_INVITE_MEMBER'), getWorkspaceInvitations);


export default router;
