import bcrypt from "bcrypt";
import {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
} from "../models/Users.js";
import {
  createSession,
  deleteSessionByRefreshToken,
  findSessionByRefreshToken,
} from "../models/Session.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const refreshCookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
  maxAge: REFRESH_TOKEN_TTL,
};

const refreshCookieClearOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? "none" : "lax",
};

export const signUp = async (req, res) => {
  try {
    const { username, password, email, name } = req.body;

    if (!username || !password || !email || !name) {
      return res.status(400).json({
        message: "Khong the thieu username, password, email hoac name",
      });
    }

    const duplicateUsername = await findUserByUsername(username);
    if (duplicateUsername) {
      return res.status(409).json({ message: "Username da ton tai" });
    }

    const duplicateEmail = await findUserByEmail(email);
    if (duplicateEmail) {
      return res.status(409).json({ message: "Email da ton tai" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser(username, hashedPassword, email, name);
    return res.status(201).json({
      message: "Dang ky thanh cong",
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi server khi dang ky", error: error.message });
  }
};

export const signIn = async (req, res) => {
  try {
    // lấy input
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Khong the thieu email hoac password" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email khong hop le" });
    }
    if (email.length > 255) {
      return res
        .status(400)
        .json({ message: "Email khong duoc qua 255 ky tu" });
    }
    // lấy hash password từ database
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Sai email hoac password" });
    }

    // so sánh password với hash password
    const passwordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!passwordCorrect) {
      return res.status(401).json({ message: "Sai email hoac password" });
    }

    //nếu khớp, tạo token và trả về cho client
    const access_token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    // tạo refresh token và lưu vào database
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // tạo session mới để lưu refresh token
    await createSession(user.user_id, refreshToken);

    // trả refresh token về trong cookie
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);
    // trả access token về cho res
    return res.status(200).json({
      message: "Dang nhap thanh cong",
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        name: user.name,
        access_token,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi server khi dang nhap", error: error.message });
  }
};

const sanitizeGoogleUsername = (source = "") =>
  source
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 30);

const generateUniqueUsername = async (email, fallbackName = "google_user") => {
  const emailPart = sanitizeGoogleUsername(email.split("@")[0] || "");
  const base =
    emailPart || sanitizeGoogleUsername(fallbackName) || "google_user";
  let candidate = base;
  let suffix = 1;
  while (await findUserByUsername(candidate)) {
    candidate = `${base}_${suffix++}`;
  }
  return candidate;
};

export const googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Khong the thieu idToken" });
    }
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res
        .status(500)
        .json({ message: "GOOGLE_CLIENT_ID chua duoc cau hinh" });
    }
    if (!process.env.ACCESS_TOKEN_SECRET) {
      return res
        .status(500)
        .json({ message: "ACCESS_TOKEN_SECRET chua duoc cau hinh" });
    }

    const googleClient = new OAuth2Client(googleClientId);

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ message: "Google token khong hop le" });
    }

    let user = await findUserByEmail(payload.email);
    if (!user) {
      const username = await generateUniqueUsername(
        payload.email,
        payload.name || "google_user",
      );
      const randomPasswordHash = await bcrypt.hash(
        crypto.randomBytes(32).toString("hex"),
        10,
      );
      user = await createUser(
        username,
        randomPasswordHash,
        payload.email,
        payload.name || username,
        payload.picture || null,
      );
    }

    const access_token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const refreshToken = crypto.randomBytes(64).toString("hex");
    await createSession(user.user_id, refreshToken);
    res.cookie("refreshToken", refreshToken, refreshCookieOptions);

    return res.status(200).json({
      message: "Dang nhap Google thanh cong",
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        name: user.name,
        access_token,
      },
    });
  } catch (error) {
    const msg = error?.message || "Loi khong xac dinh";

    if (
      msg.includes("Wrong recipient") ||
      msg.includes("Token used too late") ||
      msg.includes("Invalid token signature")
    ) {
      return res.status(401).json({
        message: "Google token khong hop le hoac sai cau hinh Google Client ID",
        error: msg,
      });
    }

    return res
      .status(500)
      .json({ message: "Loi server khi dang nhap Google", error: msg });
  }
};

export const signOut = async (req, res) => {
  try {
    // lấy refresh token từ cookie
    const token = req.cookies.refreshToken;

    // xóa refresh token trong session database
    if (token) {
      await deleteSessionByRefreshToken(token);

      // xóa cookie refresh token
      res.clearCookie("refreshToken", refreshCookieClearOptions);
    }

    return res.status(200).json({ message: "Dang xuat thanh cong" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi server khi dang xuat", error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "Token khong hop le" });
    }

    const session = await findSessionByRefreshToken(token);

    if (!session) {
      return res.status(403).json({ message: "Token khong hop le" });
    }

    if (session.expires_at < new Date()) {
      return res.status(403).json({ message: "Token da het han" });
    }
    const user = await findUserById(session.user_id);
    if (!user) {
      return res.status(403).json({ message: "User khong ton tai" });
    }

    const access_token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );
    const newRefreshToken = crypto.randomBytes(64).toString("hex");
    await deleteSessionByRefreshToken(token);
    await createSession(user.user_id, newRefreshToken);
    res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

    return res.status(200).json({
      message: "Refresh token thanh cong",
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        name: user.name,
        access_token,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Loi server khi refresh token", error: error.message });
  }
};
