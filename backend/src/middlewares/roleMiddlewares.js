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

export default requirePermission;
