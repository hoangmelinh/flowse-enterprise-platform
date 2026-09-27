import { beApi } from "../callApi";
import type { SignInResponse, SignUpResponse } from "../../types/auth";
import { getAccessToken } from "../../utils/localStorage";

export const signIn = async (email: string, password: string): Promise<SignInResponse> => {
    return beApi.post("/auth/signin", { email, password });
}

export const signUp = async (email: string, password: string, username : string, name : string, inviteToken?: string): Promise<SignUpResponse> => {
    return beApi.post("/auth/signup", { email, password, username, name, inviteToken });
}

export const signOut = async (): Promise<void> => {
    return beApi.post("/auth/signout");
}
export const refreshToken = async (): Promise<SignInResponse> => {
    return beApi.post("/auth/refresh");
}
export const signInWithGoogle = async (idToken: string, inviteToken?: string): Promise<SignInResponse> => {
    return beApi.post("/auth/google", { idToken, inviteToken });
}
export const getToken = (): string | null => {
    return getAccessToken();
};

export const isTokenExpired = (): boolean => {
    const token = getToken();
    if (!token) return true;

    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return true;

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        const payload = JSON.parse(jsonPayload);
        
        const bufferSeconds = 10;
        return (payload.exp - bufferSeconds) * 1000 < Date.now();
        
    } catch (error) {
        console.error('Error decoding token:', error);
        return true;
    }
};
