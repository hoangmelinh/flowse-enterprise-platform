import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Lấy IP máy chủ phát triển khi debug bằng máy thật hoặc máy ảo Android (10.0.2.2)
const getDevHost = () => {
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  return 'localhost';
};

const DEV_API_HOST = getDevHost();

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || `http://${DEV_API_HOST}:5001/api/v1`,
  socketUrl: process.env.EXPO_PUBLIC_SOCKET_URL || `http://${DEV_API_HOST}:5001`,
  apiTimeoutMs: 15000,
  // Chế độ xem thử: dữ liệu mẫu, không cần backend (EXPO_PUBLIC_DEMO=1 khi chạy expo start)
  demo: process.env.EXPO_PUBLIC_DEMO === '1',
  maxOfflineRetries: 5,
  slaPollIntervalMs: 30000,
};

export default config;
