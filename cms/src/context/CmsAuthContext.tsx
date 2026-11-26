import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    clearCmsStorage,
    getCmsToken,
    getStoredCmsUser,
    getStoredWorkspaceId,
    setCmsToken,
    setStoredCmsUser,
    setStoredWorkspaceId,
} from '@/api/client';
import {
    getUserContexts,
    signInCms,
    signOutCms,
    type CmsUserCapabilities,
    type CmsUserContext,
    type CmsWorkspaceSummary,
} from '@/api/cmsApi';

const DEFAULT_CAPABILITIES: CmsUserCapabilities = {
    is_admin: false,
    is_manager: false,
    can_access_cms: false,
    can_manage_workspace: false,
    can_manage_members: false,
    can_manage_departments: false,
    can_manage_assets: false,
    can_manage_workflows: false,
    can_manage_inspections: false,
    can_view_audit: false,
    can_view_analytics: false,
    can_approve: false,
    can_triage_incident: false,
    can_assign_work: false,
};

interface CmsAuthContextValue {
    isAuthenticated: boolean;
    isLoading: boolean;
    context: CmsUserContext | null;
    workspaces: CmsWorkspaceSummary[];
    currentWorkspaceId: number | null;
    currentRole: string;
    capabilities: CmsUserCapabilities;
    isAdmin: boolean;
    isManager: boolean;
    canAccessCms: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshContext: (workspaceId?: number | null) => Promise<void>;
    switchWorkspace: (workspaceId: number) => Promise<void>;
}

const CmsAuthContext = createContext<CmsAuthContextValue | null>(null);

export const CmsAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [context, setContext] = useState<CmsUserContext | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getCmsToken()));
    const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getCmsToken()));
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(() => getStoredWorkspaceId());

    const refreshContext = useCallback(async (overrideWorkspaceId?: number | null) => {
        const token = getCmsToken();
        if (!token) {
            setIsAuthenticated(false);
            setContext(null);
            setIsLoading(false);
            return;
        }
        try {
            setIsLoading(true);
            const urlParams = new URLSearchParams(window.location.search);
            const urlWs = urlParams.get('workspaceId');
            const parsedUrlWs = urlWs && Number.isInteger(Number(urlWs)) && Number(urlWs) > 0 ? Number(urlWs) : null;
            const targetWs = overrideWorkspaceId ?? parsedUrlWs ?? getStoredWorkspaceId();
            const res = await getUserContexts(targetWs || undefined);
            const data = res?.data;
            if (data) {
                setContext(data);
                setIsAuthenticated(true);
                setStoredCmsUser(data.user);
                const resolvedWsId = data.current_workspace_id || data.workspaces?.[0]?.workspace_id || null;
                setCurrentWorkspaceId(resolvedWsId);
                setStoredWorkspaceId(resolvedWsId);
            }
        } catch {
            clearCmsStorage();
            setIsAuthenticated(false);
            setContext(null);
            setCurrentWorkspaceId(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (getCmsToken()) {
            refreshContext();
        } else {
            setIsLoading(false);
        }
    }, [refreshContext]);

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await signInCms(email, password);
            const token = res?.user?.access_token || res?.accessToken;
            if (!token) {
                throw new Error('Không nhận được token xác thực từ máy chủ');
            }
            setCmsToken(token);
            if (res.user) {
                setStoredCmsUser(res.user);
            }
            setIsAuthenticated(true);
            await refreshContext();
        },
        [refreshContext]
    );

    const logout = useCallback(async () => {
        try {
            await signOutCms();
        } catch {
            // Ignore network error on logout
        } finally {
            clearCmsStorage();
            setIsAuthenticated(false);
            setContext(null);
            setCurrentWorkspaceId(null);
        }
    }, []);

    const switchWorkspace = useCallback(
        async (workspaceId: number) => {
            setStoredWorkspaceId(workspaceId);
            setCurrentWorkspaceId(workspaceId);
            await refreshContext(workspaceId);
        },
        [refreshContext]
    );

    const storedUser = getStoredCmsUser<{ name?: string; email?: string }>();
    const workspaces = context?.workspaces || [];
    const currentRole = (context?.current_role || 'member').toLowerCase();
    const capabilities: CmsUserCapabilities = context?.capabilities
        ? { ...DEFAULT_CAPABILITIES, ...context.capabilities }
        : DEFAULT_CAPABILITIES;

    const value: CmsAuthContextValue = {
        isAuthenticated,
        isLoading,
        context: context || (storedUser ? ({ user: storedUser } as CmsUserContext) : null),
        workspaces,
        currentWorkspaceId,
        currentRole,
        capabilities,
        isAdmin: Boolean(capabilities.is_admin || currentRole === 'admin'),
        isManager: Boolean(capabilities.is_manager || currentRole === 'admin' || currentRole === 'manager'),
        canAccessCms: Boolean(capabilities.can_access_cms || currentRole === 'admin' || currentRole === 'manager'),
        login,
        logout,
        refreshContext,
        switchWorkspace,
    };

    return <CmsAuthContext.Provider value={value}>{children}</CmsAuthContext.Provider>;
};

export const useCmsAuth = () => {
    const ctx = useContext(CmsAuthContext);
    if (!ctx) {
        throw new Error('useCmsAuth must be used inside CmsAuthProvider');
    }
    return ctx;
};
