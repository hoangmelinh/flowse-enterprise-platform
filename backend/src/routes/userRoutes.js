import express from "express";
import {
  authMe,
  getProfiles,
  updateProfiles,
  requestPasswordChangeOtp,
  verifyAndChangePassword,
} from "../controllers/userControllers.js";
import { otpRequestLimiter, otpVerifyLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

router.get("/me", authMe);
router.get("/profiles", getProfiles);
router.put("/profiles", updateProfiles);
router.post("/request-password-otp", otpRequestLimiter, requestPasswordChangeOtp);
router.post("/verify-change-password", otpVerifyLimiter, verifyAndChangePassword);

export default router;
