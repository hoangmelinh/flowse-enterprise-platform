import { io, Socket } from "socket.io-client";
import { getAccessToken } from "../utils/localStorage";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

let socket: Socket | null = null;

/**
 * Lấy hoặc khởi tạo Socket singleton client
 */
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: (cb) => {
        cb({ token: getAccessToken() });
      },
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("[Socket.IO Client] Đã kết nối thành công tới máy chủ realtime:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket.IO Client] Kết nối realtime lỗi nhẹ, đang tự động kết nối lại...", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket.IO Client] Đã ngắt kết nối:", reason);
    });
  }

  return socket;
};

/**
 * Cập nhật lại token cho socket khi user vừa login hoặc refresh token
 */
export const updateSocketAuth = (token: string) => {
  if (socket) {
    socket.emit("REFRESH_AUTH", { token });
  }
};

/**
 * Ngắt kết nối socket khi đăng xuất
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
