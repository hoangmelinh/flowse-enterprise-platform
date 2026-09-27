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

export const verifyChangePassword = async (otp: string): Promise<ChangePasswordResponse> => {
    return beApi.post("/users/verify-change-password", { otp });
};
