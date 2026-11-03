import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import pool from "../config/connect.js";

/** workspace_id chứa việc (task → list → space). */
const workspaceOfTask = async (taskId) =>
  (
    await pool.query(
      `SELECT s.workspace_id FROM tasks t JOIN lists l ON l.list_id = t.list_id JOIN spaces s ON s.space_id = l.space_id WHERE t.task_id = $1`,
      [taskId]
    )
  ).rows[0]?.workspace_id ?? null;

class SocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Phòng user được vào: phòng cá nhân, workspace mình là thành viên, hội thoại mình tham gia.
   * Không phòng nào khác (kể cả `user_<id>` của người khác).
   */
  async canJoin(userId, room) {
    const m = /^(user|workspace|conversation)_(\d+)$/.exec(String(room));
    if (!m) return false;
    const id = Number(m[2]);
    if (m[1] === "user") return id === Number(userId);
    const q =
      m[1] === "workspace"
        ? "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND deleted_at IS NULL"
        : "SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2";
    return (await pool.query(q, [id, userId])).rows.length > 0;
  }

  /**
   * Khởi tạo Socket.IO Server và gắn vào HTTP Server
   */
  init(httpServer, allowedOrigins = []) {
    this.io = new Server(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST"],
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // 1. Bắt buộc JWT hợp lệ khi bắt tay; không cho kết nối ẩn danh
    this.io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace("Bearer ", "");
        if (!token) return next(new Error("UNAUTHORIZED"));
        socket.user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        next();
      } catch (err) {
        next(new Error("UNAUTHORIZED"));
      }
    });

    // 2. Kết nối: vào phòng cá nhân, gắn handler, rồi vào mọi workspace mình là thành viên
    this.io.on("connection", async (socket) => {
      const userId = socket.user.user_id;
      socket.join(`user_${userId}`);

      // Xin vào phòng (hội thoại vừa mở...): chỉ khi canJoin cho phép
      socket.on("join_room", async (roomName) => {
        try {
          if (await this.canJoin(userId, roomName)) socket.join(roomName);
          else socket.emit("JOIN_DENIED", { room: roomName });
        } catch (err) {
          console.error("[Socket.IO] join_room lỗi:", err.message);
        }
      });

      socket.on("leave_room", (roomName) => socket.leave(roomName));

      // Token mới (refresh) phải là của cùng user; đổi user thì phải kết nối lại
      socket.on("REFRESH_AUTH", ({ token } = {}) => {
        try {
          const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
          if (decoded.user_id === userId) socket.user = decoded;
        } catch (e) {
          console.warn("[Socket.IO] Token refresh không hợp lệ");
        }
      });

      // Gắn handler xong mới tra workspace, để join_room gửi ngay lúc kết nối không bị mất
      try {
        const ws = await pool.query("SELECT workspace_id FROM workspace_members WHERE user_id = $1 AND deleted_at IS NULL", [userId]);
        ws.rows.forEach((r) => socket.join(`workspace_${r.workspace_id}`));
      } catch (err) {
        console.error("[Socket.IO] Không lấy được workspace của user:", err.message);
      }
    });

    console.log("[Socket.IO] Realtime Server đã khởi tạo sẵn sàng!");
    return this.io;
  }

  // --- HÀM PHÁT SỰ KIỆN (EMITTERS) CHUẨN PROPOSAL MỤC 9 ---

  /**
   * Bắn sự kiện tới 1 người dùng cụ thể
   */
  emitToUser(userId, event, payload) {
    if (!this.io || !userId) return;
    this.io.to(`user_${userId}`).emit(event, payload);
  }

  /**
   * Bắn sự kiện tới thành viên 1 workspace. Không rõ workspace thì không phát (tránh lộ sang công ty khác).
   */
  emitToWorkspace(workspaceId, event, payload) {
    if (!this.io || !workspaceId) return;
    this.io.to(`workspace_${workspaceId}`).emit(event, payload);
  }

  /** Phát tới workspace chứa việc `payload.task_id`. Lỗi tra cứu chỉ ghi log, không làm hỏng thao tác chính. */
  emitForTask(event, payload) {
    if (!this.io) return;
    workspaceOfTask(payload.task_id)
      .then((ws) => this.emitToWorkspace(ws, event, { ...payload, emitted_at: new Date().toISOString() }))
      .catch((err) => console.error(`[Socket.IO] ${event}:`, err.message));
  }

  /**
   * Phát thông báo khi có Sự cố mới (INCIDENT_CREATED)
   */
  emitIncidentCreated(incidentData) {
    this.emitForTask("INCIDENT_CREATED", incidentData);
  }

  /**
   * Phát thông báo khi Chuyển trạng thái quy trình (WORKFLOW_TRANSITIONED)
   */
  emitWorkflowTransitioned(transitionData) {
    this.emitForTask("WORKFLOW_TRANSITIONED", transitionData);
  }

  /**
   * Phát thông báo cá nhân đẩy xuống Notification Center (NOTIFICATION_PUSH + NEW_NOTIFICATION cho chuông header)
   */
  emitNotificationPush(targetUserId, notificationData) {
    const payload = { ...notificationData, emitted_at: new Date().toISOString() };
    this.emitToUser(targetUserId, "NOTIFICATION_PUSH", payload);
    this.emitToUser(targetUserId, "NEW_NOTIFICATION", notificationData);
  }

  /**
   * Phát thông báo khi có yêu cầu cấp vật tư (PARTS_REQUESTED)
   */
  emitPartsRequested(managerIds = [], requestData) {
    for (const mId of managerIds) this.emitToUser(mId, "PARTS_REQUESTED", requestData);
  }

  /**
   * Phát thông báo khi vật tư đã được phê duyệt (PARTS_APPROVED)
   */
  emitPartsApproved(technicianId, approvalData) {
    this.emitToUser(technicianId, "PARTS_APPROVED", approvalData);
  }
}

const socketService = new SocketService();
export default socketService;
