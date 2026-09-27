import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
import { createInvitations, checkExistingInvitation, deleteInvitation, respondToInvitation } from "../models/Member.js";
import jwt from 'jsonwebtoken';
import { findWorkspaceById } from "../models/Workspaces.js";
import { removeWorkspaceMember } from "../models/Workspaces.js";
import { findUserById } from "../models/Users.js";

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

export const InviteMember = async (req, res) => {
    try {
        const { email, workspace_id, role } = req.body;

        // 1. Validate đầu vào
        if (!email || !workspace_id || !role) {
            return res.status(400).json({ message: "Email, workspace_id và role là bắt buộc", receivedBody: req.body });
        }

        const trimmedRole = role.trim();

        const existingInvitation = await checkExistingInvitation(workspace_id, email);
        if (existingInvitation) {
            return res.status(400).json({ message: "Lời mời đã được gửi trước đó" });
        }

        const workspace = await findWorkspaceById(workspace_id);
        const inviter = await findUserById(req.user.user_id);

        const workspaceName = workspace?.name || "Workspace";
        const inviterName = inviter?.name || inviter?.username || "Một thành viên";
        const inviterEmail = inviter?.email || "";
        const safeWorkspaceName = escapeHtml(workspaceName);
        const safeInviterName = escapeHtml(inviterName);
        // 3. Tạo Token (Nhúng thêm workspaceName và inviterName)
        const inviteToken = jwt.sign(
            {
                email: email,
                workspace_id: workspace_id,
                workspaceName: workspaceName,
                inviterName: inviterName,
                inviterEmail: inviterEmail
            },
            process.env.EMAIL_TOKEN_SECRET,
            { expiresIn: "1d" }
        );

        const invitationRecord = await createInvitations(workspace_id, email, inviteToken, req.user.user_id, trimmedRole);
        if (!invitationRecord) {
            return res.status(500).json({ message: "Không thể tạo lời mời lúc này" });
        }

        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const invitationLink = `${clientUrl}/join-workspace?token=${inviteToken}`;

        const { data, error } = await resend.emails.send({
            from: "Flowise <invite@contact.flowise.id.vn>",
            to: [email],
            subject: `${inviterName} đã mời bạn tham gia ${workspaceName} trên Floswise`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2>Chào bạn,</h2>
                    <p><strong>${safeInviterName}</strong> vừa mời bạn tham gia làm việc trong dự án <strong>${safeWorkspaceName}</strong>.</p>
                    <p>Vui lòng click vào nút bên dưới để chấp nhận (Link có hiệu lực trong 24 giờ):</p>
                    <br/>
                    <a href="${invitationLink}" style="display: inline-block; padding: 12px 24px; background-color: #0058be; color: white; font-weight: bold; text-decoration: none; border-radius: 8px;">
                        Tham gia ngay
                    </a>
                </div>
            `,
        });

        if (error) {
            console.error("Lỗi từ Resend:", error);
            await deleteInvitation(invitationRecord.invitation_id);
            return res.status(400).json({ message: "Không thể gửi email lúc này", error });
        }

        res.status(200).json({ message: "Đã gửi lời mời thành công", data });

    } catch (error) {
        console.error("Error inviting member:", error);
        return res.status(500).json({ message: "Lỗi Server nội bộ" });
    }
}

export const verifyInvitation = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ message: "Token là bắt buộc" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.EMAIL_TOKEN_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }

        const { email, workspace_id, workspaceName, inviterName, inviterEmail } = decoded;

        const invitation = await checkExistingInvitation(workspace_id, email);
        if (!invitation || invitation.token !== token) {
            return res.status(404).json({ message: "Lời mời không tồn tại, đã bị thu hồi hoặc đã được xử lý" });
        }

        const { findUserByEmail } = await import("../models/Users.js");
        const existingUser = await findUserByEmail(email);

        return res.status(200).json({
            email: email,
            isUserExists: !!existingUser,
            workspaceId: workspace_id,
            workspaceName: workspaceName,
            inviterName: inviterName,
            inviterEmail: inviterEmail
        });

    } catch (error) {
        console.error("Error verifying invitation:", error);
        return res.status(500).json({ message: "Lỗi Server nội bộ" });
    }
};
export const RespondToInvitation = async (req, res) => {
    try {
        const { token, action } = req.body;

        if (!token || !action) {
            return res.status(400).json({ message: "Token và action là bắt buộc" });
        }

        if (!['accept', 'reject'].includes(action)) {
            return res.status(400).json({ message: "Hành động không hợp lệ" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.EMAIL_TOKEN_SECRET);
        } catch (err) {
            console.error("Lỗi xác thực token:", err);
            return res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
        }

        const { email, workspace_id } = decoded;

        if (
            String(req.user.email || "").toLowerCase() !==
            String(email || "").toLowerCase()
        ) {
            return res.status(403).json({ message: "Email đăng nhập không khớp với email được mời!" });
        }

        const invitation = await respondToInvitation({
            workspaceId: workspace_id,
            email,
            token,
            userId: req.user.user_id,
            action,
        });
        if (!invitation) {
            return res.status(404).json({ message: "Lời mời không tồn tại hoặc đã được xử lý" });
        }

        if (action === 'accept') {
            return res.status(200).json({ message: "Bạn đã gia nhập Workspace thành công!" });
        }
        else {
            return res.status(200).json({ message: "Bạn đã từ chối lời mời tham gia Workspace." });
        }

    } catch (error) {
        console.error("Error responding to invitation:", error);
        return res.status(500).json({ message: "Lỗi Server nội bộ" });
    }
};

export const RemoveMember = async (req, res) => {
    try {
        const workspaceId = req.body.workspaceId || req.body.workspace_id;
        const userId = req.body.userId || req.body.user_id;

        if (!workspaceId || !userId) {
            return res.status(400).json({ message: "workspaceId va userId la bat buoc" });
        }

        if (Number(userId) === Number(req.user?.user_id)) {
            return res.status(400).json({ message: "Khong the tu xoa chinh ban khoi Workspace" });
        }

        const removedMember = await removeWorkspaceMember(workspaceId, userId);
        if (!removedMember) {
            return res.status(404).json({ message: "Thanh vien khong ton tai trong Workspace" });
        }

        return res.status(200).json({ message: "Da xoa thanh vien khoi Workspace", data: removedMember });
    } catch (error) {
        console.error("Error removing member:", error);
        return res.status(500).json({ message: "Loi Server noi bo" });
    }
};
