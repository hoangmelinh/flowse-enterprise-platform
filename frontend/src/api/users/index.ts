import { beApi } from "../callApi";

// ── Profile ──────────────────────────────────────────────────────────────────

export interface UserProfileData {
    user_id: number;
    username: string;
    name: string;
    email: string;
    avatar_url: string | null;
    sdt: string | null;
}

export interface UpdateProfilePayload {
    name?: string;
    avatar_url?: string;
    sdt?: string;
}

export const getProfile = async (): Promise<{ message: string; users: UserProfileData }> => {
    return beApi.get("/users/profiles");
};

export const updateProfile = async (
    payload: UpdateProfilePayload
): Promise<{ message: string }> => {
    return beApi.put("/users/profiles", payload);
};

// ── Password ─────────────────────────────────────────────────────────────────

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface ChangePasswordResponse {
    message: string;
}

export interface RequestOtpResponse {
    message: string;
    maskedEmail: string;
}

export const requestPasswordOtp = async (
    payload: ChangePasswordPayload
): Promise<RequestOtpResponse> => {
    return beApi.post("/users/request-password-otp", payload);
};

export interface UserCapabilities {
    can_scan_qr: boolean;
    can_report_incident: boolean;
    can_triage_incident: boolean;
    can_execute_repair: boolean;
    can_verify_incident: boolean;
    can_close_incident: boolean;
    can_run_inspection: boolean;
    can_approve: boolean;
    can_create_task: boolean;
    can_assign_work: boolean;
    is_admin?: boolean;
    is_manager?: boolean;
    can_access_cms?: boolean;
    can_manage_workspace?: boolean;
    can_manage_members?: boolean;
    can_manage_departments?: boolean;
    can_manage_assets?: boolean;
    can_manage_workflows?: boolean;
    can_manage_inspections?: boolean;
    can_view_audit?: boolean;
    can_view_analytics?: boolean;
}

export interface DepartmentNode {
    department_id: number;
    name: string;
    code: string;
    manager_id: number | null;
    manager_name?: string | null;
    parent_id: number | null;
    workspace_id?: number | null;
    member_count?: number;
    children?: DepartmentNode[];
}

export interface UserContextData {
    user: UserProfileData & {
        employee_code?: string | null;
        department_id?: number | null;
        department_name?: string | null;
        department_code?: string | null;
    };
    workspaces: Array<{
        workspace_id: number;
        name: string;
        slug: string;
        description?: string | null;
        role_name: 'admin' | 'manager' | 'member' | string;
    }>;
    current_workspace_id: number | null;
    current_role?: 'admin' | 'manager' | 'member' | string;
    departments: DepartmentNode[];
    accessible_department_ids: number[] | null;
    managed_department_ids?: number[];
    capabilities: UserCapabilities;
}

export const getUserContexts = async (
    workspaceId?: number | null
): Promise<{ success: boolean; data: UserContextData }> => {
    return beApi.get("/users/contexts", {
        params: workspaceId ? { workspaceId } : undefined,
    });
};

export const verifyChangePassword = async (otp: string): Promise<ChangePasswordResponse> => {
    return beApi.post("/users/verify-change-password", { otp });
};
