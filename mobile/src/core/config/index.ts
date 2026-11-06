import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Máy thật chạy Expo Go: backend chạy cùng máy với Metro, nên lấy IP từ địa chỉ Metro (đổi Wi-Fi vẫn đúng).
// Không có Metro (bản build): máy ảo Android dùng 10.0.2.2, còn lại localhost.
const getDevHost = () => {
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) return metroHost;
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
  demo: __DEV__ && process.env.EXPO_PUBLIC_DEMO === '1',
  maxOfflineRetries: 5,
  slaPollIntervalMs: 30000,
};

export default config;
