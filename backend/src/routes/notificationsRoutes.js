import express from "express";
import {
  getNotifications,
  getMentionNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notificationsController.js";

const router = express.Router();

// GET /api/v1/notifications — toàn bộ thông báo (dùng cho bell icon)
router.get("/", getNotifications);

// GET /api/v1/notifications/mentions — thông báo assign + deadline (dùng cho tab Mentions)
router.get("/mentions", getMentionNotifications);

// PATCH /api/v1/notifications/read-all — đánh dấu tất cả đã đọc
router.patch("/read-all", markAllNotificationsAsRead);

// PATCH /api/v1/notifications/:notificationId/read — đánh dấu 1 thông báo đã đọc
router.patch("/:notificationId/read", markNotificationAsRead);

// DELETE /api/v1/notifications/:notificationId — xóa mềm 1 thông báo
router.delete("/:notificationId", deleteNotification);

export default router;
