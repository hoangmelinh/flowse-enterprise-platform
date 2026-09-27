import express from "express";
import {
  getSpacesByWorkspaceId,
  createSpace,
  getSpaceById,
  updateSpaces,
  deleteSpaces,
  getSpaceMembers,
  getSpaceDetails,
  inviteMembersToSpace,
  removeMemberFromSpace,
} from "../controllers/spaceController.js";

// Import Middleware Phân quyền
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { requireWorkspaceMembership, requireSpaceMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();


router.get("/workspaces/:workspaceId", requireWorkspaceMembership, getSpacesByWorkspaceId);



// Chỉ Admin mới được tạo Space -> Check quyền SPACE_CREATE tại Workspace
router.post("/workspaces/:workspaceId", requirePermission('SPACE_CREATE'), createSpace);



router.get("/:spaceId", requireSpaceMembership, getSpaceById);



// Admin + Manager mới được cập nhật Space
router.put("/:spaceId", requirePermission('SPACE_UPDATE'), updateSpaces);


// Chỉ Admin mới được xóa Space
router.delete("/:spaceId", requirePermission('SPACE_DELETE'), deleteSpaces);



router.get("/:spaceId/members", requireSpaceMembership, getSpaceMembers);


router.get("/spacesDetails/:spaceId", requireSpaceMembership, getSpaceDetails);

// Mời thành viên vào Space -> Yêu cầu quyền: SPACE_MANAGE_MEMBERS (Admin + Manager)
router.post("/:spaceId/members", requirePermission('SPACE_MANAGE_MEMBERS'), inviteMembersToSpace);

// Xóa thành viên khỏi Space -> Yêu cầu quyền: SPACE_MANAGE_MEMBERS (Admin + Manager)
router.delete("/:spaceId/members/:userId", requirePermission('SPACE_MANAGE_MEMBERS'), removeMemberFromSpace);

export default router;
