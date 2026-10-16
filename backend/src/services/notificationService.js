import con from "../config/connect.js";
import EmailService from "./emailService.js";
import socketService from "./socketService.js";

/**
 * Enterprise Notification & Anti-Spam Throttling Service (Flowse 2.0)
 * Quản lý định tuyến thông báo theo RBAC và ngăn chặn spam lặp lại
 */
class NotificationService {
  /**
   * Kiểm tra và ghi nhận Throttling (Anti-Spam).
   * Mặc định: 60 phút chỉ cho phép gửi 1 lần đối với cùng một throttleKey.
   */
  static async checkAndRecordThrottle(throttleKey, intervalMinutes = 60) {
    try {
      const selectRes = await con.query(
        `SELECT last_sent_at, sent_count FROM notification_throttles WHERE throttle_key = $1`,
        [throttleKey]
      );

      const now = new Date();
      if (selectRes.rows.length > 0) {
        const lastSent = new Date(selectRes.rows[0].last_sent_at);
        const diffMinutes = (now.getTime() - lastSent.getTime()) / (1000 * 60);

        if (diffMinutes < intervalMinutes) {
          // Bị throttle ngăn chặn (chống spam)
          return {
            allowed: false,
            remainingMinutes: Math.ceil(intervalMinutes - diffMinutes),
            lastSentAt: lastSent,
          };
        }

        // Đã qua khoảng thời gian giãn cách -> Cho phép gửi lại và cập nhật
        await con.query(
          `UPDATE notification_throttles 
           SET last_sent_at = CURRENT_TIMESTAMP, sent_count = sent_count + 1 
           WHERE throttle_key = $1`,
          [throttleKey]
        );
        return { allowed: true };
      }

      // Khóa mới -> Thêm mới vào bảng throttles
      await con.query(
        `INSERT INTO notification_throttles (throttle_key, last_sent_at, sent_count)
         VALUES ($1, CURRENT_TIMESTAMP, 1)`,
        [throttleKey]
      );
      return { allowed: true };
    } catch (err) {
      console.error("[NotificationService] Lỗi kiểm tra throttle:", err.message);
      return { allowed: true }; // Fallback an toàn nếu có lỗi DB
    }
  }

  /**
   * Tạo một thông báo in-app cơ bản cho một người dùng cụ thể
   */
  static async createInAppNotification({
    userId,
    actorId = null,
    entityId = null,
    entityType = "TASK",
    type = "SYSTEM",
    content,
    priority = "NORMAL",
    dedupKey = null,
    metadata = {},
  }) {
    try {
      const query = `
        INSERT INTO notifications (user_id, actor_id, entity_id, entity_type, type, content, priority, dedup_key, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const res = await con.query(query, [
        userId,
        actorId,
        entityId,
        entityType,
        type,
        content,
        priority,
        dedupKey,
        JSON.stringify(metadata),
      ]);
      const notif = res.rows[0];
      // Bắn sự kiện thời gian thực (Realtime Push Notification)
      socketService.emitNotificationPush(userId, notif);
      return notif;
    } catch (err) {
      console.error("[NotificationService] Lỗi tạo in-app notification:", err.message);
      return null;
    }
  }

  /**
   * Lấy danh sách tài khoản theo vai trò (Role): 'admin', 'manager', 'technician'
   */
  static async getUsersByRoles(roles = ["admin", "manager"]) {
    try {
      const query = `
        SELECT u.user_id, u.email, u.name, u.username, r.role_name
        FROM users u
        JOIN user_roles ur ON u.user_id = ur.user_id
        JOIN roles r ON ur.role_id = r.role_id
        WHERE LOWER(r.role_name) = ANY($1) AND u.is_active = TRUE
      `;
      const lowerRoles = roles.map((r) => r.toLowerCase());
      const res = await con.query(query, [lowerRoles]);
      return res.rows;
    } catch (err) {
      // Fallback nếu chưa gán role bảng trung gian, lấy danh sách user active
      const fallback = await con.query(
        `SELECT user_id, email, name, username, 'admin' as role_name FROM users WHERE is_active = TRUE LIMIT 5`
      );
      return fallback.rows;
    }
  }

  /**
   * Phát tán thông báo Sự cố Hiện trường (Incident Alert) dựa trên RBAC & Throttling
   */
  static async dispatchIncidentAlert({
    incidentId,
    taskId,
    taskName,
    assetCode,
    severity,
    type = "INCIDENT_REPORTED",
    priority = "NORMAL",
    actorId = null,
    slaDeadline = null,
    customMessage = null,
  }) {
    const isCriticalOrHigh = severity === "CRITICAL" || severity === "HIGH" || priority === "URGENT";
    const throttleKey = `ALERT_${type}_INCIDENT_${incidentId}`;

    // Kiểm tra chống spam với chu kỳ 60 phút
    const throttleCheck = await this.checkAndRecordThrottle(throttleKey, 60);
    if (!throttleCheck.allowed) {
      console.log(
        `[NotificationService] Bỏ qua gửi cảnh báo cho ${throttleKey} (Chặn spam: còn ${throttleCheck.remainingMinutes} phút giãn cách)`
      );
      return { throttled: true, remainingMinutes: throttleCheck.remainingMinutes };
    }

    const messageContent =
      customMessage ||
      `[${severity}] Sự cố: ${taskName} trên thiết bị ${assetCode || "N/A"}.`;

    // 1. Gửi cho Quản lý & Quản trị viên (Manager & Admin)
    const managersAndAdmins = await this.getUsersByRoles(["admin", "manager"]);
    for (const user of managersAndAdmins) {
      await this.createInAppNotification({
        userId: user.user_id,
        actorId,
        entityId: taskId,
        entityType: "INCIDENT",
        type,
        content: messageContent,
        priority,
        dedupKey: `${throttleKey}_USER_${user.user_id}`,
        metadata: { incidentId, taskId, assetCode, severity, slaDeadline },
      });

      // Nếu mức độ nguy cấp (CRITICAL/HIGH hoặc vỡ SLA), gửi thêm Email cảnh báo qua Brevo
      if (isCriticalOrHigh && user.email) {
        await EmailService.sendSlaAlert({
          toEmail: user.email,
          toName: user.name || user.username,
          incidentTitle: taskName,
          assetCode,
          severity,
          slaStatus: priority === "URGENT" ? "BREACHED" : "AT_RISK",
          deadline: slaDeadline || new Date().toISOString(),
          actionUrl: "http://localhost:5173/incidents",
        });
      }
    }

    return { success: true, notifiedCount: managersAndAdmins.length };
  }

  /**
   * Phát thông báo Yêu cầu xin cấp vật tư (Procurement Request)
   * Gửi in-app + Brevo Email cho Ban Quản lý (Manager/Admin)
   */
  static async dispatchProcurementRequestAlert({
    incidentId,
    taskId,
    taskName,
    partName,
    quantity,
    reason,
    requesterName,
    actorId = null,
  }) {
    const throttleKey = `PROCUREMENT_REQ_INCIDENT_${incidentId}_${partName}`;
    const throttleCheck = await this.checkAndRecordThrottle(throttleKey, 10);
    if (!throttleCheck.allowed) {
      return { throttled: true };
    }

    const managers = await this.getUsersByRoles(["admin", "manager"]);
    const content = `[XIN CẤP VẬT TƯ] ${requesterName || "Kỹ thuật viên"} yêu cầu ${quantity}x ${partName} cho sự cố "${taskName}".`;

    for (const m of managers) {
      await this.createInAppNotification({
        userId: m.user_id,
        actorId,
        entityId: taskId,
        entityType: "REQUEST",
        type: "PARTS_REQUESTED",
        content,
        priority: "HIGH",
        metadata: { incidentId, taskId, partName, quantity, reason },
      });

      if (m.email) {
        await EmailService.sendProcurementRequestAlert({
          toEmail: m.email,
          toName: m.name || m.username,
          incidentTitle: taskName,
          partName,
          quantity,
          reason,
          approvalUrl: "http://localhost:5173/approvals",
        });
      }
    }

    return { success: true, managersNotified: managers.length };
  }

  /**
   * Phát thông báo khi Vật tư đã được phê duyệt
   * Gửi lại cho Kỹ thuật viên phụ trách (Assignee)
   */
  static async dispatchPartsApprovedNotification({
    incidentId,
    taskId,
    taskName,
    partName,
    technicianUserId,
    actorId = null,
  }) {
    if (!technicianUserId) return;

    const content = `[VẬT TƯ ĐÃ DUYỆT] Yêu cầu cấp ${partName} cho "${taskName}" đã được phê duyệt. Tiến trình sửa chữa đã tự động mở lại!`;

    await this.createInAppNotification({
      userId: technicianUserId,
      actorId,
      entityId: taskId,
      entityType: "INCIDENT",
      type: "PARTS_APPROVED",
      content,
      priority: "HIGH",
      metadata: { incidentId, taskId, partName },
    });
  }
}

export default NotificationService;
