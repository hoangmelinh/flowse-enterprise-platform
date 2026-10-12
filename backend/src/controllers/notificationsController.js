import {
  findNotificationsByUserId,
  countUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
  findNotificationsByTypes,
  findUpcomingDeadlineTasksForUser,
  createDeadlineNotificationIfNotExists,
} from "../models/Notifications.js";

// --- GET all notifications (dùng chung, cho bell icon header) ---
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const notifications = await findNotificationsByUserId(userId, parseInt(limit), parseInt(offset));
    const unreadCount = await countUnreadNotifications(userId);

    res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Failed to retrieve notifications:", error.message);
    res.status(500).json({ error: "Failed to retrieve notifications" });
  }
};

// --- GET notifications dành cho tab "Mentions" (assign + deadline) ---
export const getMentionNotifications = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Tự động tạo notification deadline nếu có task sắp hết hạn hôm nay
    try {
      const upcomingTasks = await findUpcomingDeadlineTasksForUser(userId);
      const deadlinePromises = upcomingTasks.map((task) =>
        createDeadlineNotificationIfNotExists(userId, task.task_id, task.name, task.due_date)
      );
      await Promise.allSettled(deadlinePromises);
    } catch (deadlineErr) {
      // fire-and-forget: không block response nếu lỗi
      console.error("[getMentionNotifications] deadline check error:", deadlineErr.message);
    }

    const notifications = await findNotificationsByTypes(
      userId,
      ["task_assigned", "task_deadline"],
      parseInt(limit),
      parseInt(offset)
    );

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    console.error("Failed to retrieve mention notifications:", error.message);
    res.status(500).json({ error: "Failed to retrieve mention notifications" });
  }
};

// --- PATCH /:notificationId/read ---
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.user_id;

    if (!notificationId) {
      return res.status(400).json({ error: "Notification ID is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const notification = await markAsRead(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json(notification);
  } catch (error) {
    console.error("Failed to mark notification as read:", error.message);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

// --- PATCH /read-all ---
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const notifications = await markAllAsRead(userId);
    res.status(200).json({
      message: "All notifications marked as read",
      count: notifications.length,
    });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error.message);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};

// --- DELETE /:notificationId ---
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.user_id;

    if (!notificationId) {
      return res.status(400).json({ error: "Notification ID is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const deleted = await deleteNotificationById(notificationId, userId);
    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }
    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Failed to delete notification:", error.message);
    res.status(500).json({ error: "Failed to delete notification" });
  }
};

// --- POST /test-email (Kiểm thử cấu hình Brevo Email) ---
export const testBrevoEmail = async (req, res) => {
  try {
    const user = req.user;
    const recipientEmail = req.body?.email || user?.email;

    if (!recipientEmail) {
      return res.status(400).json({ error: "Vui lòng cung cấp email nhận thử nghiệm" });
    }

    const { default: EmailService } = await import("../services/emailService.js");
    const result = await EmailService.sendEmail({
      toEmail: recipientEmail,
      toName: user?.name || user?.username || "Thành viên Flowse",
      subject: "[Flowse 2.0] Thử nghiệm cấu hình Brevo Email thành công!",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #2563eb;">🎉 Xin chào ${user?.name || user?.username || "bạn"},</h2>
          <p>Hệ thống Flowse Enterprise đã kết nối và gửi email thành công qua <strong>Brevo API</strong>!</p>
          <p>Thời gian gửi: ${new Date().toLocaleString("vi-VN")}</p>
        </div>
      `,
    });

    res.status(200).json({
      message: result.mocked
        ? "Đã mô phỏng gửi mail thành công (Cần cấu hình BREVO_API_KEY trong backend/.env để gửi mail thực tế)"
        : "Đã gửi email thử nghiệm thành công qua Brevo!",
      result,
    });
  } catch (error) {
    console.error("Failed to send test email:", error.message);
    res.status(500).json({ error: error.message });
  }
};