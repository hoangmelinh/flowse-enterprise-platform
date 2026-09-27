import express from "express";
import {
    InviteMember,
    verifyInvitation,
    RespondToInvitation,
    RemoveMember,
} from "../controllers/memberController.js";

// Import Middleware Phân quyền
import { requirePermission } from '../middlewares/roleMiddlewares.js';
import { protectedRoute } from "../middlewares/authMiddlewares.js";
import { inviteLimiter } from "../middlewares/rateLimitMiddleware.js";
const router = express.Router();

// Xác minh lời mời (trước khi đăng nhập/đăng ký)
router.get("/invitations/verify/:token", verifyInvitation);

// Mời thành viên vào Workspace -> Yêu cầu quyền: WORKSPACE_INVITE_MEMBER (Chỉ Admin)
router.post("/invitations", protectedRoute, requirePermission('WORKSPACE_INVITE_MEMBER'), inviteLimiter, InviteMember);

// Phản hồi lời mời (accept/reject) -> Không cần check quyền (user tự xử lý lời mời của mình)
router.post("/respond-to-invitation",protectedRoute ,RespondToInvitation);

// Xóa thành viên khỏi Workspace -> Yêu cầu quyền: WORKSPACE_MANAGE_ROLES (Chỉ Admin)
router.post("/remove-member", protectedRoute, requirePermission('WORKSPACE_MANAGE_ROLES'), RemoveMember);

export default router;