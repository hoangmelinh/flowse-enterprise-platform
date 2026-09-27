import express from "express";
import { chatWithAI, generateDescription, suggestPriority } from "../controllers/aiController.js";
import { aiChatLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();
router.post("/chat", aiChatLimiter, chatWithAI);
router.post("/generate-description", aiChatLimiter, generateDescription);
router.post("/suggest-priority", aiChatLimiter, suggestPriority);

export default router;
