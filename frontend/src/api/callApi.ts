import axios, {
    type AxiosInstance,
    type InternalAxiosRequestConfig,
    type AxiosResponse,
} from 'axios';
import { toast } from 'sonner';
import { getAccessToken, removeAccessToken, setAccessToken } from '../utils/localStorage';
import { ApiError, type ApiErrorPayload } from '../utils/errorUtils';

type RetryableAxiosRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean;
};

type RefreshTokenResponse = {
    user?: {
        access_token?: string;
    };
};

const STATUS_TOAST_MAP: Record<number, string> = {
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn không có quyền thực hiện thao tác này.',
    404: 'Không tìm thấy dữ liệu yêu cầu.',
    409: 'Dữ liệu bị xung đột. Vui lòng kiểm tra lại.',
    429: 'Quá nhiều yêu cầu. Vui lòng đợi một lúc rồi thử lại.',
    500: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
    502: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.',
    503: 'Máy chủ đang bảo trì. Vui lòng thử lại sau.',
};

let refreshAccessTokenPromise: Promise<string> | null = null;

function getLoginRedirectUrl(): string {
    const currentParams = new URLSearchParams(window.location.search);
    const inviteToken =
        currentParams.get('inviteToken') ||
        (window.location.pathname === '/join-workspace'
            ? currentParams.get('token')
            : null);

    return inviteToken
        ? `/login?inviteToken=${encodeURIComponent(inviteToken)}`
        : '/login';
}

function redirectToLogin(): void {
    window.location.href = getLoginRedirectUrl();
}

function isRefreshRequest(config?: RetryableAxiosRequestConfig): boolean {
    return config?.url?.includes('/auth/refresh') ?? false;
}

function isTokenAuthError(status: number, payload: ApiErrorPayload): boolean {
    const message = payload.message.toLowerCase();
    return status === 401 || (status === 403 && message.includes('token'));
}

function createAxiosInstance(baseURL: string): AxiosInstance {
    const instance = axios.create({
        baseURL,
        withCredentials: true,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    instance.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
            const token = getAccessToken();
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error: unknown) => Promise.reject(error),
    );

    instance.interceptors.response.use(
        (response: AxiosResponse) => response.data,

        async (error: unknown) => {
            if (!axios.isAxiosError(error) || !error.response) {
                const isTimeout = axios.isAxiosError(error) && error.code === 'ECONNABORTED';
                toast.error(
                    isTimeout
                        ? 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.'
                        : 'Không có kết nối mạng. Vui lòng kiểm tra lại.',
                    { id: 'network-error' },
                );
                return Promise.reject(
                    new Error(isTimeout ? 'Request timeout' : 'Network Error'),
                );
            }

            const { status, data } = error.response;
            const originalRequest = error.config as RetryableAxiosRequestConfig | undefined;

            const payload: ApiErrorPayload = {
                status: status >= 500 ? 'error' : 'fail',
                errorCode: (data as ApiErrorPayload)?.errorCode ?? 'UNKNOWN',
                message:
                    (data as ApiErrorPayload)?.message ??
                    (data as { error?: string })?.error ??
                    STATUS_TOAST_MAP[status] ??
                    'Đã có lỗi xảy ra',
                details: (data as ApiErrorPayload)?.details,
            };
            const apiError = new ApiError(payload, status);

            if (
                originalRequest &&
                !originalRequest._retry &&
                !isRefreshRequest(originalRequest) &&
                isTokenAuthError(status, payload)
            ) {
                originalRequest._retry = true;

                try {
                    if (!refreshAccessTokenPromise) {
                        refreshAccessTokenPromise = instance
                            .post<RefreshTokenResponse>('/auth/refresh')
                            .then((response) => {
                                const refreshResponse = response as RefreshTokenResponse;
                                const accessToken = refreshResponse.user?.access_token;
                                if (!accessToken) {
                                    throw new Error('Missing access token from refresh response');
                                }

                                setAccessToken(accessToken);
                                return accessToken;
                            })
                            .finally(() => {
                                refreshAccessTokenPromise = null;
                            });
                    }

                    const newAccessToken = await refreshAccessTokenPromise;
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    }

                    return instance(originalRequest);
                } catch {
                    removeAccessToken();
                    toast.error(STATUS_TOAST_MAP[401], { id: 'unauthorized' });
                    redirectToLogin();
                    return Promise.reject(apiError);
                }
            }

            if (status === 401) {
                removeAccessToken();
                toast.error(STATUS_TOAST_MAP[401], { id: 'unauthorized' });
                redirectToLogin();
            } else {
                const toastMessage = STATUS_TOAST_MAP[status] ?? payload.message;
                toast.error(toastMessage, { id: `err-${status}` });
            }

            return Promise.reject(apiError);
        },
    );

    return instance;
}

// ─────────────────────────────────────────────────────────────
// Export instance
// ─────────────────────────────────────────────────────────────
const GATEWAY_URL = import.meta.env.VITE_API_GATEWAY_URL;
const BASE_URL = GATEWAY_URL ? `${GATEWAY_URL}/api/v1/` : '/api/v1/';

export const beApi = createAxiosInstance(BASE_URL);
