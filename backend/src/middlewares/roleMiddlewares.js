import {
    checkSpacePermission,
    checkInheritedWorkspacePermission,
    checkWorkspacePermission,
} from '../models/Permission.js';
import { getDirectSpaceId, resolveSpaceIdFromParams } from '../utils/resolveSpace.js';

export const requirePermission = (requiredPermission, options = {}) => async (req, res, next) => {
    const { allowNoSpace = false } = options;
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ message: 'Chua xac thuc. Vui long dang nhap.' });
        }

        let spaceId = getDirectSpaceId(req);

        if (!spaceId) {
            const lookup = await resolveSpaceIdFromParams(req.params);
            if (lookup.error) return res.status(404).json({ message: lookup.error });
            spaceId = lookup.spaceId;
        }

        const workspaceId = req.params.workspaceId
            || req.body?.workspaceId || req.body?.workspace_id
            || null;

        let hasPermission = false;

        if (spaceId) {
            hasPermission = await checkSpacePermission(spaceId, userId, requiredPermission);
            if (!hasPermission) {
                hasPermission = await checkInheritedWorkspacePermission(spaceId, userId, requiredPermission);
            }
            req.resolvedSpaceId = spaceId;
        } else if (workspaceId) {
            hasPermission = await checkWorkspacePermission(workspaceId, userId, requiredPermission);
        } else {
            if (allowNoSpace) return next();
            return res.status(400).json({
                message: 'Khong the xac dinh ngu canh phan quyen. Thieu spaceId hoac workspaceId.',
            });
        }

        if (!hasPermission) {
            return res.status(403).json({
                message: `Forbidden: Ban khong co quyen [${requiredPermission}] de thuc hien hanh dong nay.`,
            });
        }

        return next();
    } catch (error) {
        console.error('[requirePermission] Error:', error);
        return res.status(500).json({ message: 'Loi may chu khi kiem tra quyen truy cap.' });
    }
};

import pool from '../config/connect.js';
import Department from '../models/Department.js';

export const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập.' });
        }

        // Kiểm tra xem user có vai trò admin trong workspace hoặc hệ thống không
        const roleRes = await pool.query(
            `SELECT LOWER(r.role_name) as role_name 
             FROM workspace_members wm 
             JOIN roles r ON wm.role_id = r.role_id 
             WHERE wm.user_id = $1 AND wm.deleted_at IS NULL AND LOWER(r.role_name) = 'admin'
             LIMIT 1`,
            [userId]
        );

        if (roleRes.rows.length > 0 || req.user?.role === 'admin') {
            return next();
        }

        const totalMembers = await pool.query('SELECT COUNT(*) FROM workspace_members');
        if (parseInt(totalMembers.rows[0].count, 10) === 0) {
            return next();
        }

        return res.status(403).json({
            message: 'Forbidden: Bạn cần quyền Quản trị viên (Admin) để thực hiện thao tác này.'
        });
    } catch (error) {
        console.error('[requireAdmin] Error:', error);
        return res.status(500).json({ message: 'Lỗi server khi kiểm tra quyền Quản trị viên.' });
    }
};

export const requireManagerOrAdmin = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập.' });
        }

        // Kiểm tra xem user có vai trò admin hoặc manager trong workspace không
        const roleRes = await pool.query(
            `SELECT LOWER(r.role_name) as role_name 
             FROM workspace_members wm 
             JOIN roles r ON wm.role_id = r.role_id 
             WHERE wm.user_id = $1 AND wm.deleted_at IS NULL AND LOWER(r.role_name) IN ('admin', 'manager')
             LIMIT 1`,
            [userId]
        );

        if (roleRes.rows.length > 0 || ['admin', 'manager'].includes(req.user?.role)) {
            return next();
        }

        // Kiểm tra xem user có phải là Trưởng phòng/Quản đốc của bất kỳ Department nào không
        const deptMgr = await pool.query(
            `SELECT department_id FROM departments WHERE manager_id = $1 LIMIT 1`,
            [userId]
        );
        if (deptMgr.rows.length > 0) {
            return next();
        }

        return res.status(403).json({
            message: 'Forbidden: Bạn cần vai trò Quản lý (Manager) hoặc Quản trị viên (Admin) để thực hiện.'
        });
    } catch (error) {
        console.error('[requireManagerOrAdmin] Error:', error);
        return res.status(500).json({ message: 'Lỗi server khi kiểm tra vai trò Quản lý.' });
    }
};

export const requireDepartmentScope = (getDeptId) => async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập.' });
        }

        const deptId = typeof getDeptId === 'function' ? await getDeptId(req) : (req.params.departmentId || req.body.department_id);
        if (!deptId) {
            return next();
        }

        const inScope = await Department.isDepartmentInScope(userId, deptId);
        if (!inScope) {
            return res.status(403).json({
                message: 'Forbidden: Bạn không có quyền truy cập dữ liệu ngoài phạm vi phòng ban/phân xưởng của mình.'
            });
        }
        return next();
    } catch (error) {
        console.error('[requireDepartmentScope] Error:', error);
        return res.status(500).json({ message: 'Lỗi server khi kiểm tra Resource Scope.' });
    }
};

export default requirePermission;
