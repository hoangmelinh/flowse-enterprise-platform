import { Server } from "socket.io";
import jwt from "jsonwebtoken";

class SocketService {
  constructor() {
    this.io = null;
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

    // 1. Middleware Handshake JWT Authentication
    this.io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace("Bearer ", "");

        if (!token) {
          // Cho phép kết nối ẩn danh ở chế độ demo nếu chưa đăng nhập, nhưng không gán room riêng
          socket.user = { user_id: "anonymous", role: "guest" };
          return next();
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        console.warn("[Socket.IO] Xác thực JWT thất bại:", err.message);
        // Fallback demo an toàn thay vì ngắt socket
        socket.user = { user_id: "anonymous", role: "guest" };
        next();
      }
    });

    // 2. Xử lý khi có Client kết nối thành công
    this.io.on("connection", (socket) => {
      const user = socket.user;
      console.log(`[Socket.IO] Client kết nối: socket_id=${socket.id}, user_id=${user?.user_id}`);

      // Tự động gán vào phòng cá nhân
      if (user?.user_id && user.user_id !== "anonymous") {
        socket.join(`user_${user.user_id}`);
      }

      // Tự động gán vào phòng workspace nếu có
      if (user?.workspace_id) {
        socket.join(`workspace_${user.workspace_id}`);
      }

      // Lắng nghe yêu cầu join phòng thủ công từ client
      socket.on("join_room", (roomName) => {
        socket.join(roomName);
        console.log(`[Socket.IO] ${socket.id} đã vào phòng: ${roomName}`);
      });

      socket.on("leave_room", (roomName) => {
        socket.leave(roomName);
        console.log(`[Socket.IO] ${socket.id} đã rời phòng: ${roomName}`);
      });

      // Lắng nghe cập nhật auth token mới
      socket.on("REFRESH_AUTH", ({ token }) => {
        try {
          if (token) {
            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.user = decoded;
            socket.join(`user_${decoded.user_id}`);
            console.log(`[Socket.IO] Cập nhật token thành công cho user_id=${decoded.user_id}`);
          }
        } catch (e) {
          console.warn("[Socket.IO] Token refresh không hợp lệ");
        }
      });

      socket.on("disconnect", (reason) => {
        console.log(`[Socket.IO] Client ngắt kết nối: ${socket.id} (Lý do: ${reason})`);
      });
    });

    console.log("[Socket.IO] Realtime Server đã khởi tạo sẵn sàng!");
    return this.io;
  }

  // --- HÀM PHÁT SỰ KIỆN (EMITTERS) CHUẨN PROPOSAL MỤC 9 ---

  /**
   * Bắn sự kiện tới 1 người dùng cụ thể
   */
  emitToUser(userId, event, payload) {
    if (!this.io) return;
    this.io.to(`user_${userId}`).emit(event, payload);
  }

  /**
   * Bắn sự kiện tới toàn bộ thành viên trong 1 workspace
   */
  emitToWorkspace(workspaceId, event, payload) {
    if (!this.io) return;
    if (workspaceId) {
      this.io.to(`workspace_${workspaceId}`).emit(event, payload);
    }
    // Đồng thời phát broadcast chung cho toàn bộ client đang mở app (phục vụ demo 2 tab)
    this.io.emit(event, payload);
  }

  /**
   * Phát thông báo khi có Sự cố mới (INCIDENT_CREATED)
   */
  emitIncidentCreated(incidentData, workspaceId = null) {
    console.log("[Socket.IO] Broadcast INCIDENT_CREATED:", incidentData?.task_name);
    this.emitToWorkspace(workspaceId, "INCIDENT_CREATED", {
      ...incidentData,
      emitted_at: new Date().toISOString(),
    });
  }

  /**
   * Phát thông báo khi Chuyển trạng thái quy trình (WORKFLOW_TRANSITIONED)
   */
  emitWorkflowTransitioned(transitionData, workspaceId = null) {
    console.log("[Socket.IO] Broadcast WORKFLOW_TRANSITIONED:", transitionData?.current_state);
    this.emitToWorkspace(workspaceId, "WORKFLOW_TRANSITIONED", {
      ...transitionData,
      emitted_at: new Date().toISOString(),
    });
  }

  /**
   * Phát thông báo cá nhân đẩy xuống Notification Center (NOTIFICATION_PUSH)
   */
  emitNotificationPush(targetUserId, notificationData) {
    console.log(`[Socket.IO] Gửi NOTIFICATION_PUSH tới user_${targetUserId}`);
    this.emitToUser(targetUserId, "NOTIFICATION_PUSH", {
      ...notificationData,
      emitted_at: new Date().toISOString(),
    });
    // Đồng thời bắn broadcast dự phòng để chuông header cập nhật tức thì
    if (this.io) {
      this.io.emit("NEW_NOTIFICATION", notificationData);
    }
  }

  /**
   * Phát thông báo khi có yêu cầu cấp vật tư (PARTS_REQUESTED)
   */
  emitPartsRequested(managerIds = [], requestData) {
    for (const mId of managerIds) {
      this.emitToUser(mId, "PARTS_REQUESTED", requestData);
    }
    if (this.io) {
      this.io.emit("PARTS_REQUESTED", requestData);
    }
  }

  /**
   * Phát thông báo khi vật tư đã được phê duyệt (PARTS_APPROVED)
   */
  emitPartsApproved(technicianId, approvalData) {
    if (technicianId) {
      this.emitToUser(technicianId, "PARTS_APPROVED", approvalData);
    }
    if (this.io) {
      this.io.emit("PARTS_APPROVED", approvalData);
    }
  }
}

const socketService = new SocketService();
export default socketService;
