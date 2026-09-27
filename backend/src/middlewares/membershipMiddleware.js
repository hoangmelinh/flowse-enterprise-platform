import con from '../config/connect.js';
import { getDirectSpaceId, resolveSpaceIdFromParams } from '../utils/resolveSpace.js';

export const requireWorkspaceMembership = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) return res.status(401).json({ message: 'Chua xac thuc.' });

        const workspaceId = req.params.workspaceId || req.params.workspace_id;
        if (!workspaceId) return res.status(400).json({ message: 'Thieu workspaceId.' });

        const result = await con.query(
            `SELECT 1 FROM workspace_members
             WHERE workspace_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
            [workspaceId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'Ban khong phai thanh vien cua Workspace nay.' });
        }

        next();
    } catch (error) {
        console.error('[requireWorkspaceMembership] Error:', error);
        return res.status(500).json({ message: 'Loi may chu khi kiem tra quyen truy cap.' });
    }
};

export const requireSpaceMembership = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) return res.status(401).json({ message: 'Chua xac thuc.' });

        let spaceId = getDirectSpaceId(req);

        if (!spaceId) {
            const lookup = await resolveSpaceIdFromParams(req.params);
            if (lookup.error) return res.status(404).json({ message: lookup.error });
            spaceId = lookup.spaceId;
        }

        if (!spaceId) {
            return res.status(404).json({ message: 'Khong tim thay resource hoac da bi xoa.' });
        }

        const result = await con.query(
            `SELECT 1
             FROM spaces s
             WHERE s.space_id = $1
               AND s.deleted_at IS NULL
               AND (
                 EXISTS (
                   SELECT 1
                   FROM space_members sm
                   WHERE sm.space_id = s.space_id
                     AND sm.user_id = $2
                     AND sm.deleted_at IS NULL
                 )
                 OR (
                   s.is_private = FALSE
                   AND EXISTS (
                     SELECT 1
                     FROM workspace_members wm
                     WHERE wm.workspace_id = s.workspace_id
                       AND wm.user_id = $2
                       AND wm.deleted_at IS NULL
                   )
                 )
               )`,
            [spaceId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'Ban khong co quyen truy cap resource nay.' });
        }

        req.resolvedSpaceId = spaceId;
        next();
    } catch (error) {
        console.error('[requireSpaceMembership] Error:', error);
        return res.status(500).json({ message: 'Loi may chu khi kiem tra quyen truy cap.' });
    }
};

export const requireConversationMembership = async (req, res, next) => {
    try {
        const userId = req.user?.user_id;
        if (!userId) return res.status(401).json({ message: 'Chua xac thuc.' });

        const conversationId = req.params.conversationId || req.params.id;
        if (!conversationId) return res.status(400).json({ message: 'Thieu conversationId.' });

        const result = await con.query(
            `SELECT 1 FROM conversation_members
             WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ message: 'Ban khong phai thanh vien cua cuoc tro chuyen nay.' });
        }

        next();
    } catch (error) {
        console.error('[requireConversationMembership] Error:', error);
        return res.status(500).json({ message: 'Loi may chu khi kiem tra quyen truy cap.' });
    }
};
