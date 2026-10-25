import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import config from '../../core/config';
import secureStorage from '../local/secureStorage';
import { AuthError, ConflictError, NetworkError, PermissionError } from '../../core/errors/AppError';

export const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Gắn Access Token
apiClient.interceptors.request.use(
  async (reqConfig: InternalAxiosRequestConfig) => {
    const token = await secureStorage.getToken();
    if (token && reqConfig.headers) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Xử lý lỗi chuẩn Clean Architecture
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (!error.response) {
      return Promise.reject(new NetworkError(error.message, error));
    }

    const status = error.response.status;
    const msg = error.response.data?.message || error.response.data?.error || 'Lỗi xử lý yêu cầu';

    if (status === 401) {
      secureStorage.removeToken();
      return Promise.reject(new AuthError(msg, status));
    }

    if (status === 403) {
      return Promise.reject(new PermissionError(msg, status));
    }

    if (status === 409) {
      return Promise.reject(new ConflictError(msg));
    }

    return Promise.reject(error);
  }
);

export default apiClient;
