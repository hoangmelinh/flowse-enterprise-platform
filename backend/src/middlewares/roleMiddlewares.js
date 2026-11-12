import {
    checkSpacePermission,
    checkInheritedWorkspacePermission,
    checkWorkspacePermission,
} from '../models/Permission.js';
import { resolveSpaceId } from '../utils/resolveSpace.js';

export const requirePermission = (requiredPermission, options = {}) => async (req, res, next) => {
    const { allowNoSpace = false } = options;
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ message: 'Chua xac thuc. Vui long dang nhap.' });
        }

        const lookup = await resolveSpaceId(req);
        if (lookup.error) return res.status(404).json({ message: lookup.error });
        const spaceId = lookup.spaceId;

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
import { getWorkspaceRolesForTask } from '../models/Permission.js';

/** Chỉ thành viên workspace chứa việc mới đi tiếp (xem, thêm ảnh, mở lại...). 404 nếu không có việc. */
export const requireTaskMember = (getTaskId) => async (req, res, next) => {
    try {
        const taskId = await getTaskId(req);
        if (!taskId) return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
        if ((await getWorkspaceRolesForTask(req.user.user_id, taskId)).length > 0) return next();
        return res.status(403).json({ message: 'Forbidden: Dữ liệu không thuộc nơi làm việc của bạn.' });
    } catch (error) {
        console.error('[requireTaskMember] Error:', error);
        return res.status(500).json({ message: 'Lỗi server khi kiểm tra quyền truy cập.' });
    }
};

/** task_id của phiếu duyệt / sự cố trên route, dùng với requireTaskManager / requireTaskMember */
export const taskOfApproval = async (req) =>
    (await pool.query('SELECT task_id FROM approvals WHERE approval_id = $1', [req.params.approvalId])).rows[0]?.task_id;
export const taskOfIncident = async (req) =>
    (await pool.query('SELECT task_id FROM incidents WHERE incident_id = $1', [req.params.id])).rows[0]?.task_id;

/** workspace_id của một dòng: undefined khi không có id (tạo mới), null khi không tìm thấy. */
const ownerWorkspace = (table, key) => async (id) =>
    id == null || id === '' ? undefined
        : (await pool.query(`SELECT workspace_id FROM ${table} WHERE ${key} = $1`, [id])).rows[0]?.workspace_id ?? null;
export const assetWorkspace = ownerWorkspace('assets', 'asset_id');
export const departmentWorkspace = ownerWorkspace('departments', 'department_id');

/**
 * Chỉ admin của workspace sở hữu tài nguyên mới đi tiếp. `getWorkspaceId(req)` trả workspace của tài nguyên
 * (hoặc của phòng ban cha khi tạo mới). Không có thì lấy workspace_id trong body, rồi workspace duy nhất
 * mà user làm admin. Workspace đã kiểm được gắn vào req.workspaceId để controller lưu.
 */
export const requireAdmin = (getWorkspaceId) => async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập.' });
        }

        let workspaceId = await getWorkspaceId(req);
        if (workspaceId === null) return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });

        const adminOf = (await pool.query(
            `SELECT wm.workspace_id
             FROM workspace_members wm
             JOIN roles r ON wm.role_id = r.role_id
             WHERE wm.user_id = $1 AND wm.deleted_at IS NULL AND LOWER(r.role_name) = 'admin'`,
            [userId]
        )).rows.map((r) => r.workspace_id);

        workspaceId ??= Number(req.body?.workspace_id) || (adminOf.length === 1 ? adminOf[0] : undefined);
        if (!workspaceId && adminOf.length > 1) {
            return res.status(400).json({ message: 'Thiếu workspace_id: bạn quản trị nhiều nơi làm việc.' });
        }
        if (adminOf.includes(Number(workspaceId))) {
            req.workspaceId = Number(workspaceId);
            return next();
        }

        return res.status(403).json({
            message: 'Forbidden: Bạn cần quyền Quản trị viên (Admin) tại nơi làm việc này.'
        });
    } catch (error) {
        console.error('[requireAdmin] Error:', error);
        return res.status(500).json({ message: 'Lỗi server khi kiểm tra quyền Quản trị viên.' });
    }
};

/**
 * Chỉ admin/manager trong workspace chứa việc, hoặc trưởng phòng ban của việc, mới đi tiếp.
 * `getTaskId(req)` trả task_id của tài nguyên trên route (phiếu duyệt, sự cố...).
 */
export const requireTaskManager = (getTaskId) => async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) {
            return res.status(401).json({ message: 'Chưa xác thực. Vui lòng đăng nhập.' });
        }
        const taskId = await getTaskId(req);
        if (!taskId) {
            return res.status(404).json({ message: 'Không tìm thấy dữ liệu.' });
        }
        const roles = await getWorkspaceRolesForTask(userId, taskId);
        if (roles.includes('admin') || roles.includes('manager')) {
            return next();
        }
        if (roles.length > 0) {
            const dept = await pool.query(
                `SELECT COALESCE(t.department_id, ast.department_id) AS department_id
                 FROM tasks t
                 LEFT JOIN incidents inc ON inc.task_id = t.task_id
                 LEFT JOIN assets ast ON ast.asset_id = inc.asset_id
                 WHERE t.task_id = $1 LIMIT 1`,
                [taskId]
            );
            const deptId = dept.rows[0]?.department_id;
            if (deptId && (await Department.getManagedDepartmentIds(userId, 'member')).includes(deptId)) {
                return next();
            }
        }
        return res.status(403).json({
            message: 'Forbidden: Bạn cần vai trò Quản lý (Manager) hoặc Quản trị viên (Admin) tại nơi làm việc này.'
        });
    } catch (error) {
        console.error('[requireTaskManager] Error:', error);
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
