import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { requestPasswordOtp, verifyChangePassword, getProfile, updateProfile } from "@/api/users";
import type { ChangePasswordPayload, UserProfileData, UpdateProfilePayload } from "@/api/users";

export interface UsersState {
    // Profile
    profile: UserProfileData | null;
    isLoadingProfile: boolean;
    profileError: string | null;
    isUpdatingProfile: boolean;
    updateProfileError: string | null;
    updateProfileSuccess: boolean;
    // Password
    isChangingPassword: boolean;
    errorChangePassword: string | null;
    changePasswordSuccess: boolean;
    // OTP flow
    isRequestingOtp: boolean;
    otpRequested: boolean;
    maskedEmail: string | null;
    errorRequestOtp: string | null;
    isVerifyingOtp: boolean;
    errorVerifyOtp: string | null;
}

export const fetchGetProfile = createAsyncThunk<
    UserProfileData,
    void,
    { rejectValue: string }
>(
    "users/getProfile",
    async (_, { rejectWithValue }) => {
        try {
            const response = await getProfile();
            return response.users;
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                (error as { message?: string }).message ||
                "Không thể tải thông tin cá nhân";
            return rejectWithValue(message);
        }
    }
);

export const fetchUpdateProfile = createAsyncThunk<
    UserProfileData,
    UpdateProfilePayload,
    { rejectValue: string }
>(
    "users/updateProfile",
    async (payload, { rejectWithValue, dispatch }) => {
        try {
            await updateProfile(payload);
            // Re-fetch để lấy data mới nhất
            const result = await dispatch(fetchGetProfile());
            if (fetchGetProfile.fulfilled.match(result)) return result.payload;
            throw new Error("Không thể tải lại thông tin");
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                (error as { message?: string }).message ||
                "Cập nhật thông tin thất bại";
            return rejectWithValue(message);
        }
    }
);

export const fetchRequestPasswordOtp = createAsyncThunk<
    { message: string; maskedEmail: string },
    ChangePasswordPayload,
    { rejectValue: string }
>(
    "users/requestPasswordOtp",
    async (payload, { rejectWithValue }) => {
        try {
            const response = await requestPasswordOtp(payload);
            return response;
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                (error as { message?: string }).message ||
                "Không thể gửi OTP";
            return rejectWithValue(message);
        }
    }
);

export const fetchVerifyChangePassword = createAsyncThunk<
    { message: string },
    string,
    { rejectValue: string }
>(
    "users/verifyChangePassword",
    async (otp, { rejectWithValue }) => {
        try {
            const response = await verifyChangePassword(otp);
            return response;
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                (error as { message?: string }).message ||
                "Xác thực OTP thất bại";
            return rejectWithValue(message);
        }
    }
);

const initialState: UsersState = {
    profile: null,
    isLoadingProfile: false,
    profileError: null,
    isUpdatingProfile: false,
    updateProfileError: null,
    updateProfileSuccess: false,
    isChangingPassword: false,
    errorChangePassword: null,
    changePasswordSuccess: false,
    isRequestingOtp: false,
    otpRequested: false,
    maskedEmail: null,
    errorRequestOtp: null,
    isVerifyingOtp: false,
    errorVerifyOtp: null,
};

const usersSlice = createSlice({
    name: "users",
    initialState,
    reducers: {
        clearChangePasswordState(state) {
            state.isChangingPassword = false;
            state.errorChangePassword = null;
            state.changePasswordSuccess = false;
            state.isRequestingOtp = false;
            state.otpRequested = false;
            state.maskedEmail = null;
            state.errorRequestOtp = null;
            state.isVerifyingOtp = false;
            state.errorVerifyOtp = null;
        },
        clearUpdateProfileState(state) {
            state.isUpdatingProfile = false;
            state.updateProfileError = null;
            state.updateProfileSuccess = false;
        },
    },
    extraReducers: (builder) => {
        // fetchGetProfile
        builder.addCase(fetchGetProfile.pending, (state) => {
            state.isLoadingProfile = true;
            state.profileError = null;
        });
        builder.addCase(fetchGetProfile.fulfilled, (state, action) => {
            state.isLoadingProfile = false;
            state.profile = action.payload;
        });
        builder.addCase(fetchGetProfile.rejected, (state, action) => {
            state.isLoadingProfile = false;
            state.profileError = typeof action.payload === "string" ? action.payload : "Không thể tải thông tin";
        });

        // fetchUpdateProfile
        builder.addCase(fetchUpdateProfile.pending, (state) => {
            state.isUpdatingProfile = true;
            state.updateProfileError = null;
            state.updateProfileSuccess = false;
        });
        builder.addCase(fetchUpdateProfile.fulfilled, (state, action) => {
            state.isUpdatingProfile = false;
            state.profile = action.payload;
            state.updateProfileSuccess = true;
        });
        builder.addCase(fetchUpdateProfile.rejected, (state, action) => {
            state.isUpdatingProfile = false;
            state.updateProfileError = typeof action.payload === "string" ? action.payload : "Cập nhật thất bại";
        });

        // Step 1 – Request OTP
        builder.addCase(fetchRequestPasswordOtp.pending, (state) => {
            state.isRequestingOtp = true;
            state.errorRequestOtp = null;
            state.otpRequested = false;
        });
        builder.addCase(fetchRequestPasswordOtp.fulfilled, (state, action) => {
            state.isRequestingOtp = false;
            state.otpRequested = true;
            state.maskedEmail = action.payload.maskedEmail;
        });
        builder.addCase(fetchRequestPasswordOtp.rejected, (state, action) => {
            state.isRequestingOtp = false;
            state.errorRequestOtp = typeof action.payload === "string" ? action.payload : "Không thể gửi OTP";
        });

        // Step 2 – Verify OTP & change password
        builder.addCase(fetchVerifyChangePassword.pending, (state) => {
            state.isVerifyingOtp = true;
            state.errorVerifyOtp = null;
        });
        builder.addCase(fetchVerifyChangePassword.fulfilled, (state) => {
            state.isVerifyingOtp = false;
            state.changePasswordSuccess = true;
            state.otpRequested = false;
        });
        builder.addCase(fetchVerifyChangePassword.rejected, (state, action) => {
            state.isVerifyingOtp = false;
            state.errorVerifyOtp = typeof action.payload === "string" ? action.payload : "Xác thực OTP thất bại";
        });
    },
});

export const { clearChangePasswordState, clearUpdateProfileState } = usersSlice.actions;
export default usersSlice.reducer;
