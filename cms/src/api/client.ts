import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1/';
const CMS_TOKEN_KEY = 'flowse_cms_access_token';
const CMS_USER_KEY = 'flowse_cms_user';
const CMS_WORKSPACE_KEY = 'flowse_cms_workspace_id';

export const getCmsToken = (): string | null => localStorage.getItem(CMS_TOKEN_KEY);

export const setCmsToken = (token: string | null) => {
    if (token) {
        localStorage.setItem(CMS_TOKEN_KEY, token);
    } else {
        localStorage.removeItem(CMS_TOKEN_KEY);
    }
};

export const getStoredWorkspaceId = (): number | null => {
    const raw = localStorage.getItem(CMS_WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const setStoredWorkspaceId = (id: number | null) => {
    if (id && id > 0) {
        localStorage.setItem(CMS_WORKSPACE_KEY, String(id));
    } else {
        localStorage.removeItem(CMS_WORKSPACE_KEY);
    }
};

export const getStoredCmsUser = <T = unknown>(): T | null => {
    const raw = localStorage.getItem(CMS_USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
};

export const setStoredCmsUser = (user: unknown | null) => {
    if (user) {
        localStorage.setItem(CMS_USER_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(CMS_USER_KEY);
    }
};

export const clearCmsStorage = () => {
    localStorage.removeItem(CMS_TOKEN_KEY);
    localStorage.removeItem(CMS_USER_KEY);
    localStorage.removeItem(CMS_WORKSPACE_KEY);
};

export const cmsHttp = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

cmsHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getCmsToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const workspaceId = getStoredWorkspaceId();
    if (workspaceId && !config.headers['x-workspace-id']) {
        config.headers['x-workspace-id'] = String(workspaceId);
    }
    return config;
});

let refreshPromise: Promise<string | null> | null = null;

cmsHttp.interceptors.response.use(
    (response) => response.data,
    async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
            originalRequest._retry = true;
            try {
                if (!refreshPromise) {
                    refreshPromise = axios
                        .post(`${API_BASE_URL.replace(/\/$/, '')}/auth/refresh`, {}, { withCredentials: true })
                        .then((res) => {
                            const newToken = res.data?.user?.access_token || res.data?.accessToken || null;
                            if (newToken) setCmsToken(newToken);
                            return newToken;
                        })
                        .catch(() => null)
                        .finally(() => {
                            refreshPromise = null;
                        });
                }
                const newToken = await refreshPromise;
                if (newToken) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return cmsHttp(originalRequest);
                }
            } catch {
                // fall through
            }
        }
        return Promise.reject(error);
    }
);
