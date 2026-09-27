import express from 'express';

import {
    getConversations,
    startDirectMessage,
    createNewChannel,
    getOrCreateSpaceChat,
    addMember,
    removeMember,
    getConversationMessages,
    postMessage,
} from '../controllers/messageController.js';

import { requireConversationMembership } from '../middlewares/membershipMiddleware.js';

const router = express.Router();

// ── Conversations ────────────────────────────────
router.get('/conversations', getConversations);
router.post('/direct', startDirectMessage);
router.post('/channels', createNewChannel);
router.post('/space', getOrCreateSpaceChat);

// ── Conversation Members ───────────────────────── (yêu cầu membership)
router.post('/conversations/:id/members', requireConversationMembership, addMember);
router.delete('/conversations/:id/members/:userId', requireConversationMembership, removeMember);

// ── Messages ───────────────────────────────────── (yêu cầu membership)
router.get('/:conversationId', requireConversationMembership, getConversationMessages);
router.post('/:conversationId', requireConversationMembership, postMessage);

export default router;
