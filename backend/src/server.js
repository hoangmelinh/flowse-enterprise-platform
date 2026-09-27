import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import con from "./config/connect.js";
import cookieParser from "cookie-parser";
import {
  authRoutes,
  userRoutes,
  workspacesRoutes,
  spaceRoutes,
  taskRoutes,
  taskStatusRoutes,
  milestoneRoutes,
  sprintRoutes,
  notificationRoutes,
  timeLogRoutes,
  activityLogRoutes,
  folderRoutes,
  listRoutes,
  memberRoutes,
  aiRoutes,
  messageRoutes,
  uploadRoutes,
  departmentRoutes,
  workflowRoutes,
  approvalRoutes,
  assetRoutes,
  incidentRoutes,
  syncRoutes,
} from "./routes/index.js";
import { protectedRoute } from "./middlewares/authMiddlewares.js";
import { globalErrorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import { generalLimiter } from "./middlewares/rateLimitMiddleware.js";

dotenv.config();

const requiredEnv = ["ACCESS_TOKEN_SECRET", "EMAIL_TOKEN_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(", ")}`);
}

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "0.0.0.0";

//middleware
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'];

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(generalLimiter);

//public route
import fs from 'fs';
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
app.use('/uploads', express.static('uploads'));

app.get("/db-health", async (req, res) => {
  try {
    const result = await con.query("SELECT NOW()");

    res.json({
      status: "OK",
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      database: "not connected",
      error: error.message,
    });
  }
});
app.use("/api/v1/auth", authRoutes);
app.use('/api/v1/members', memberRoutes);

//private route
app.use(protectedRoute);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/workspaces", workspacesRoutes);
app.use("/api/v1/spaces", spaceRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/statuses", taskStatusRoutes);
app.use("/api/v1/milestones", milestoneRoutes);
app.use("/api/v1/sprints", sprintRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/timelogs", timeLogRoutes);
app.use("/api/v1/activities", activityLogRoutes);
app.use("/api/v1/folders", folderRoutes);
app.use("/api/v1/lists", listRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/sync', syncRoutes);

// ── 404 handler (đặt sau tất cả routes) ────────────────────────
app.use(notFoundHandler);

// ── Global error handler (đặt cuối cùng) ────────────────────────
app.use(globalErrorHandler);

app.listen(PORT, HOST, () => {
  console.log(`Server is running on ${HOST}:${PORT}`);
});
