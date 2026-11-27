import { io, Socket } from 'socket.io-client';
import config from '../../core/config';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function connectSocket(token: string | null): Socket | null {
  if (config.demo || !token) {
    disconnectSocket();
    return null;
  }

  if (socket && currentToken === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  disconnectSocket();
  currentToken = token;
  socket = io(config.socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}
