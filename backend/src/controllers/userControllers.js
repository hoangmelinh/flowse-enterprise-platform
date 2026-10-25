import {
    getProfile,
    updateProfile,
    findUserById,
    getPasswordHash,
    updatePassword,
} from '../models/Users.js';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import crypto from 'crypto';
import con from '../config/connect.js';
import Department from '../models/Department.js';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

setInterval(() => {
    const now = Date.now();
    for (const [userId, value] of otpStore) {
        if (now > value.expiresAt) otpStore.delete(userId);
    }
}, OTP_CLEANUP_INTERVAL_MS).unref?.();

export const getUserContexts = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // 1. Lấy thông tin user kèm phòng ban hiện tại
        const userRes = await con.query(
            `SELECT u.user_id, u.username, u.name, u.email, u.avatar_url, u.sdt, u.phone_number, u.employee_code,
                    u.department_id, d.name AS department_name, d.code AS department_code
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.department_id
             WHERE u.user_id = $1`,
            [userId]
        );
        const user = userRes.rows[0];

        // 2. Lấy danh sách workspace và vai trò của user trong từng workspace
        const wsRes = await con.query(
            `SELECT w.workspace_id, w.name, w.slug, w.description, LOWER(r.role_name) as role_name
             FROM workspace_members wm
             JOIN workspaces w ON wm.workspace_id = w.workspace_id
             JOIN roles r ON wm.role_id = r.role_id
             WHERE wm.user_id = $1 AND wm.deleted_at IS NULL AND w.deleted_at IS NULL`,
            [userId]
        );

        // 3. Lấy cây phân cấp phòng ban (Enterprise Department Hierarchy)
        const departmentsTree = await Department.getHierarchyTree();

        // 4. Lấy phạm vi phòng ban được phép truy cập (Accessible Department IDs)
        const isWorkspaceAdmin = wsRes.rows.some((w) => w.role_name === 'admin');
        const accessibleDeptIds = await Department.getAccessibleDepartmentIds(userId, isWorkspaceAdmin ? 'admin' : 'member');

        // 5. Tính toán capabilities động dựa trên DB roles
        const isManager =
            isWorkspaceAdmin ||
            wsRes.rows.some((w) => w.role_name === 'manager') ||
            (await con.query(`SELECT 1 FROM departments WHERE manager_id = $1 LIMIT 1`, [userId])).rows.length > 0;
        const isQA =
            (user?.department_code || '').toUpperCase() === 'QA' ||
            (user?.department_code || '').toUpperCase() === 'QA_QC' ||
            isWorkspaceAdmin;

        const capabilities = {
            can_scan_qr: true,
            can_report_incident: true,
            can_triage_incident: isManager,
            can_execute_repair: true,
            can_verify_incident: isQA || isManager,
            can_close_incident: isManager,
            can_run_inspection: isQA || isManager,
            can_approve: isManager,
            can_create_task: true,
            can_assign_work: isManager,
        };

        return res.status(200).json({
            success: true,
            data: {
                user,
                workspaces: wsRes.rows,
                departments: departmentsTree,
                accessible_department_ids: accessibleDeptIds,
                capabilities,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi lấy ngữ cảnh người dùng', error: error.message });
    }
};

export const authMe = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const user = await findUserById(user_id);
        return res.status(200).json({
            success: true,
            message: 'Thông tin người dùng',
            user,
            data: user
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

export const getProfiles = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const userProfile = await getProfile(user_id);
        return res.status(200).json({
            message: 'Thong tin nguoi dung',
            users: userProfile
        });
    } catch (error) {
        return res.status(500).json({ message: 'Loi server khi lay thong tin nguoi dung', error: error.message });
    }
};

export const updateProfiles = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { name, avatar_url, sdt } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (avatar_url) updateData.avatar_url = avatar_url;
        if (sdt) updateData.sdt = sdt;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Khong co thong tin nao de cap nhat' });
        }

        await updateProfile(user_id, updateData);

        return res.status(200).json({ message: 'Thong tin nguoi dung da duoc cap nhat' });
    } catch (error) {
        return res.status(500).json({ message: 'Loi server', error: error.message });
    }
};

export const requestPasswordChangeOtp = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'Vui long nhap day du mat khau hien tai, mat khau moi va xac nhan mat khau' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mat khau moi phai co it nhat 6 ky tu' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Mat khau moi va xac nhan mat khau khong khop' });
        }

        const currentHash = await getPasswordHash(user_id);
        if (!currentHash) {
            return res.status(404).json({ message: 'Khong tim thay nguoi dung' });
        }
        const isMatch = await bcrypt.compare(currentPassword, currentHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mat khau hien tai khong dung' });
        }

        const user = await findUserById(user_id);
        if (!user?.email) {
            return res.status(404).json({ message: 'Khong tim thay email nguoi dung' });
        }

        const otp = String(crypto.randomInt(100000, 1000000));
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        otpStore.set(user_id, {
            otpHash: hashOtp(otp),
            newPasswordHash,
            expiresAt: Date.now() + OTP_TTL_MS,
            attempts: 0,
        });

        const { error } = await resend.emails.send({
            from: 'Flowise <noreply@contact.flowise.id.vn>',
            to: [user.email],
            subject: 'Ma xac thuc doi mat khau Flowise',
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #0058be; margin-bottom: 8px;">Xac thuc doi mat khau</h2>
                    <p style="color: #5f6368; margin-bottom: 24px;">Ban vua yeu cau doi mat khau tren Flowise. Nhap ma OTP ben duoi de xac nhan:</p>
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #141b2b; text-align: center; background: #f0f4ff; border-radius: 8px; padding: 16px 0; margin-bottom: 24px;">${otp}</div>
                    <p style="color: #9aa0a6; font-size: 13px;">Ma co hieu luc trong <strong>10 phut</strong>. Neu ban khong thuc hien yeu cau nay, hay bo qua email nay.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Resend error:', error);
            otpStore.delete(user_id);
            return res.status(500).json({ message: 'Khong the gui email OTP luc nay, vui long thu lai' });
        }

        const maskedEmail = user.email.replace(/(.{2})[^@]+(@.+)/, '$1***$2');
        return res.status(200).json({ message: 'OTP da duoc gui toi email cua ban', maskedEmail });
    } catch (error) {
        return res.status(500).json({ message: 'Loi server', error: error.message });
    }
};

export const verifyAndChangePassword = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({ message: 'Vui long nhap ma OTP' });
        }

        const stored = otpStore.get(user_id);
        if (!stored) {
            return res.status(400).json({ message: 'Khong tim thay yeu cau doi mat khau, vui long thu lai' });
        }
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(user_id);
            return res.status(400).json({ message: 'Ma OTP da het han, vui long yeu cau ma moi' });
        }
        if (stored.otpHash !== hashOtp(otp.trim())) {
            stored.attempts = (stored.attempts || 0) + 1;
            if (stored.attempts >= MAX_OTP_ATTEMPTS) {
                otpStore.delete(user_id);
                return res.status(400).json({ message: 'Qua nhieu lan nhap sai OTP. Vui long yeu cau ma moi.' });
            }
            return res.status(400).json({
                message: `Ma OTP khong dung. Con ${MAX_OTP_ATTEMPTS - stored.attempts} lan thu.`
            });
        }

        await updatePassword(user_id, stored.newPasswordHash);
        otpStore.delete(user_id);

        return res.status(200).json({ message: 'Cap nhat mat khau thanh cong' });
    } catch (error) {
        return res.status(500).json({ message: 'Loi server khi cap nhat mat khau', error: error.message });
    }
};
