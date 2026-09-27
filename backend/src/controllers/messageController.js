import {
    getUserConversations,
    findOrCreateDirect,
    createChannel,
    findOrCreateSpaceConversation,
    addMemberToConversation,
    removeMemberFromConversation,
    getMessages,
    sendMessage,
} from '../models/Messages.js';
import con from '../config/connect.js';

const scopedError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const isWorkspaceMember = async (workspaceId, userId) => {
    const result = await con.query(
        `SELECT 1 FROM workspace_members
         WHERE workspace_id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [workspaceId, userId]
    );
    return result.rows.length > 0;
};

const ensureWorkspaceMember = async (workspaceId, userId) => {
    if (!(await isWorkspaceMember(workspaceId, userId))) {
        throw scopedError('User is not a member of this workspace', 403);
    }
};

const normalizeUserIds = (userIds = []) => [
    ...new Set(
        userIds
            .filter((uid) => uid !== undefined && uid !== null)
            .map((uid) => Number(uid))
            .filter((uid) => Number.isInteger(uid))
    )
];

const ensureWorkspaceMembers = async (workspaceId, userIds = []) => {
    const normalizedIds = normalizeUserIds(userIds);
    if (normalizedIds.length === 0) return [];

    const result = await con.query(
        `SELECT user_id FROM workspace_members
         WHERE workspace_id = $1
           AND user_id = ANY($2::int[])
           AND deleted_at IS NULL`,
        [workspaceId, normalizedIds]
    );
    const allowedIds = new Set(result.rows.map((row) => Number(row.user_id)));
    const invalidIds = normalizedIds.filter((uid) => !allowedIds.has(uid));

    if (invalidIds.length > 0) {
        throw scopedError('One or more users are not members of this workspace', 403);
    }

    return normalizedIds;
};

const getSpaceWorkspaceId = async (spaceId) => {
    const result = await con.query(
        'SELECT workspace_id FROM spaces WHERE space_id = $1 AND deleted_at IS NULL',
        [spaceId]
    );
    if (result.rows.length === 0) {
        throw scopedError('Space not found', 404);
    }
    return result.rows[0].workspace_id;
};

const getConversationWorkspaceId = async (conversationId) => {
    const result = await con.query(
        'SELECT workspace_id FROM conversations WHERE conversation_id = $1',
        [conversationId]
    );
    if (result.rows.length === 0) {
        throw scopedError('Conversation not found', 404);
    }
    return result.rows[0].workspace_id;
};

const getSafeFileUrl = (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (trimmed.startsWith('/uploads/')) return trimmed;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:') return null;
        return parsed.toString();
    } catch {
        return null;
    }
};

const handleScopedError = (res, err) => {
    if (!err.statusCode) return false;
    res.status(err.statusCode).json({ error: err.message });
    return true;
};

// ══════════════════════════════════════════════════
// CONVERSATIONS
// ══════════════════════════════════════════════════

/** GET /api/v1/messages/conversations?workspace_id=X */
export const getConversations = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { workspace_id } = req.query;
        if (!workspace_id) return res.status(400).json({ error: 'workspace_id is required' });

        await ensureWorkspaceMember(workspace_id, userId);
        const conversations = await getUserConversations(userId, workspace_id);
        res.json(conversations);
    } catch (err) {
        console.error('getConversations error:', err);
        if (handleScopedError(res, err)) return;
        res.status(500).json({ error: err.message });
    }
};

/** POST /api/v1/messages/direct   body: { workspace_id, target_user_id } */
export const startDirectMessage = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { workspace_id, target_user_id } = req.body;
        if (!workspace_id || !target_user_id) {
            return res.status(400).json({ error: 'workspace_id and target_user_id required' });
        }
        await ensureWorkspaceMembers(workspace_id, [userId, target_user_id]);
        const conversationId = await findOrCreateDirect(workspace_id, userId, Number(target_user_id));
        res.json({ conversation_id: conversationId });
    } catch (err) {
        console.error('startDirectMessage error:', err);
        if (handleScopedError(res, err)) return;
        res.status(500).json({ error: err.message });
    }
};

/** POST /api/v1/messages/channels   body: { workspace_id, name, member_ids[] } */
export const createNewChannel = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { workspace_id, name, member_ids } = req.body;
        if (!workspace_id || !name) {
            return res.status(400).json({ error: 'workspace_id and name required' });
        }
        const requestedMemberIds = Array.isArray(member_ids) ? member_ids : [];
        const safeMemberIds = await ensureWorkspaceMembers(workspace_id, [userId, ...requestedMemberIds]);
        const channel = await createChannel(workspace_id, name.trim(), userId, safeMemberIds);
        res.status(201).json(channel);
    } catch (err) {
        console.error('createChannel error:', err);
        if (handleScopedError(res, err)) return;
        res.status(500).json({ error: err.message });
    }
};

/** POST /api/v1/messages/space   body: { workspace_id, space_id, space_name } */
export const getOrCreateSpaceChat = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { space_id, space_name } = req.body;
        if (!space_id) {
            return res.status(400).json({ error: 'space_id required' });
        }
        const workspace_id = await getSpaceWorkspaceId(space_id);
        await ensureWorkspaceMember(workspace_id, userId);
        const conversationId = await findOrCreateSpaceConversation(workspace_id, space_id, space_name || 'Space Chat');
        res.json({ conversation_id: conversationId });
    } catch (err) {
        console.error('getOrCreateSpaceChat error:', err);
        if (handleScopedError(res, err)) return;
        res.status(500).json({ error: err.message });
    }
};

/** POST /api/v1/messages/conversations/:id/members   body: { user_id } */
export const addMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });
        const workspaceId = await getConversationWorkspaceId(id);
        await ensureWorkspaceMember(workspaceId, user_id);
        await addMemberToConversation(id, Number(user_id));
        res.json({ message: 'Member added' });
    } catch (err) {
        console.error('addMember error:', err);
        if (handleScopedError(res, err)) return;
        res.status(500).json({ error: err.message });
    }
};

/** DELETE /api/v1/messages/conversations/:id/members/:userId */
export const removeMember = async (req, res) => {
    try {
        const { id, userId } = req.params;
        await removeMemberFromConversation(id, userId);
        res.json({ message: 'Member removed' });
    } catch (err) {
        console.error('removeMember error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ══════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════

/** GET /api/v1/messages/:conversationId?limit=50&before=ISO */
export const getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit, before } = req.query;
        const msgs = await getMessages(conversationId, parseInt(limit) || 50, before || null);
        res.json(msgs);
    } catch (err) {
        console.error('getMessages error:', err);
        res.status(500).json({ error: err.message });
    }
};

/** POST /api/v1/messages/:conversationId   body: { content, fileUrl, fileName, fileType } */
export const postMessage = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { conversationId } = req.params;
        const { content, fileUrl, fileName, fileType } = req.body;
        const safeFileUrl = getSafeFileUrl(fileUrl);

        if (!content?.trim() && !safeFileUrl) {
            return res.status(400).json({ error: 'content or fileUrl required' });
        }
        if (fileUrl && !safeFileUrl) {
            return res.status(400).json({ error: 'fileUrl must be https or an /uploads/ path' });
        }

        const msg = await sendMessage(conversationId, userId, content?.trim() || '', safeFileUrl, fileName || null, fileType || null);
        res.status(201).json(msg);
    } catch (err) {
        console.error('postMessage error:', err);
        res.status(500).json({ error: err.message });
    }
};
