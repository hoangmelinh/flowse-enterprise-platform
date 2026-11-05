import express from "express";
import {
    chatWithAI,
    generateDescription,
    suggestPriority,
    getAnalyticsSummary,
    draftAction,
    summarizeIncident
} from "../controllers/aiController.js";
import { applyAiAction, cancelAiAction, listAiActions } from "../controllers/aiWorkController.js";
import { aiChatLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.post("/chat", aiChatLimiter, chatWithAI);
router.post("/query", aiChatLimiter, chatWithAI); // Alias cho API Contract Matrix 2.8
router.post("/analytics-summary", aiChatLimiter, getAnalyticsSummary);
router.post("/draft-action", aiChatLimiter, draftAction);
router.post("/summarize-incident", aiChatLimiter, summarizeIncident);
router.post("/generate-description", aiChatLimiter, generateDescription);
router.post("/suggest-priority", aiChatLimiter, suggestPriority);
// Chế độ Work: AI đề xuất, người dùng áp dụng/huỷ; danh sách là Lịch sử thao tác (L10)
router.get("/actions", listAiActions);
router.post("/actions/:id/apply", applyAiAction);
router.post("/actions/:id/cancel", cancelAiAction);

export default router;
