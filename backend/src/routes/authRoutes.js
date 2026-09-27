import express from "express";
import {
  signUp,
  signIn,
  signOut,
  refreshToken,
  googleSignIn,
} from "../controllers/authControllers.js";
import { loginLimiter, signupLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();
router.post("/signup", signupLimiter, signUp);
router.post("/signin", loginLimiter, signIn);
router.post("/google", loginLimiter, googleSignIn);
router.post("/signout", signOut);
router.post("/refresh", refreshToken);

export default router;
