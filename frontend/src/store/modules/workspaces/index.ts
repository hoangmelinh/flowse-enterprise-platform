import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
    getWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceById,
    getWorkspaceMembers,
    inviteMembers,
    respondToInvitation,
    verifyInvitation,
} from '../../../api/workspaces';
import type { 
    WorkspacesData, 
    WorkspaceMemberData, 
    WorkspacesState, 
    invationVerificationData
} from '../../../types/workspaces';
import {
    persistCurrentWorkspaceId,
    readStoredWorkspaceId,
} from '../../../utils/workspaceStorage';

export const fetchWorkspaces = createAsyncThunk<WorkspacesData[], void, { rejectValue: string }>(
    'workspaces/fetchWorkspaces',
    async (_, { rejectWithValue }) => {
        try {
            const response = await getWorkspaces();
            return Array.isArray(response) ? response : [];
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message || 'Failed to fetch workspaces';
            return rejectWithValue(msg);
        }
    },
);

export const addWorkspace = createAsyncThunk<
    WorkspacesData,
    { name: string; slug: string; description: string },
    { rejectValue: string }
>('workspaces/addWorkspace', async (body, { rejectWithValue }) => {
    try {
        const response = await createWorkspace(body.name, body.slug, body.description);
        return response;
    } catch (error: unknown) {
        const msg = (error as { response?: { data?: { error?: string; message?: string } }; message?: string }).response?.data?.error || (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message || 'Failed to create workspace';
        return rejectWithValue(msg);
    }
});

export const editWorkspace = createAsyncThunk<
    WorkspacesData,
    { workspace_id: number; name: string; slug: string; description: string },
    { rejectValue: string }
>('workspaces/editWorkspace', async (body, { rejectWithValue }) => {
    try {
        const response = await updateWorkspace(
            body.workspace_id,
            body.name,
            body.slug,
            body.description,
        );
        return response;
    } catch (error: unknown) {
        const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string })          .message || 'Failed to update workspace';
        return rejectWithValue(msg);
    }
});

export const removeWorkspace = createAsyncThunk<number, { workspace_id: number; owner_id: number }, { rejectValue: string }>(
    'workspaces/removeWorkspace',
    async ({ workspace_id, owner_id }, { rejectWithValue }) => {
        try {
            await deleteWorkspace(workspace_id, owner_id);
            return workspace_id;
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message || 'Failed to delete workspace';
            return rejectWithValue(msg);
        }
    },
);

export const fetchWorkspaceById = createAsyncThunk<WorkspacesData, number, { rejectValue: string }>(
    'workspaces/fetchWorkspaceById',
    async (workspace_id, { rejectWithValue }) => {
        try {
            const response = await getWorkspaceById(workspace_id);
            return response;
        } catch (error: unknown) {
            const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string })  .message || 'Failed to fetch workspace details';
            return rejectWithValue(msg);
        }
    },
);

export const fetchWorkspaceMembers = createAsyncThunk<
    WorkspaceMemberData[],
    number,
    { rejectValue: string }
>('workspaces/fetchWorkspaceMembers', async (workspace_id, { rejectWithValue }) => {
    try {
        const response = await getWorkspaceMembers(workspace_id);
        return Array.isArray(response) ? response : [];
    } catch (error: unknown) {
        const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message || 'Failed to fetch workspace members';
        return rejectWithValue(msg);
    }
});

export const sendInvitations = createAsyncThunk<
    void,
    { workspaceId: string; emails: string; role: string },
    { rejectValue: string }
>('workspaces/sendInvitations', async ( { workspaceId, emails, role }, { rejectWithValue }) => {
    try {
        await inviteMembers(workspaceId, emails, role);
    } catch (error: unknown) {
        const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string })  .message || 'Failed to send invitations';
        return rejectWithValue(msg);
    }
});

export const respondToInvitations = createAsyncThunk<
    void,
    { token: string; action: 'accept' | 'reject' },
    { rejectValue: string }
>('workspaces/respondToInvitations', async ( { token, action }, { rejectWithValue }) => {
    try {
        await respondToInvitation(token, action);
    } catch (error: unknown) {
        const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message || 'Failed to respond to invitation';
        return rejectWithValue(msg);
    }
});

export const fetchVerifyInvitation = createAsyncThunk<
    invationVerificationData,
    string, 
    { rejectValue: string }
>('workspaces/fetchVerifyInvitation', async (token, { rejectWithValue }) => {
    try {
        const verificationData = await verifyInvitation(token);
        return verificationData;
    } catch (error: unknown) {
        // Ưu tiên lấy message lỗi từ Backend (như "Token không hợp lệ", "Lời mời hết hạn")
        const msg = (error as { response?: { data?: { message?: string } }; message?: string }).response?.data?.message || (error as { message?: string }).message || 'Failed to verify invitation';
        return rejectWithValue(msg);
    }
});

const initialState: WorkspacesState = {
    listWorkspaces: [],
    currentWorkspaceId: readStoredWorkspaceId(),
    isLoadingWorkspaces: false,
    isSendingInvitations: false,
    isRespondingInvitation: false,
    error: null,
    listWorkspaceMembers: [],
    isLoadingWorkspaceMembers: false,
    workspaceMembersError: null,
    isVerifyingInvitation: false,
    verifyInvitationError: null,
    verifyInvitationData: null,
    isUpdatingWorkspace: false,
    updateWorkspaceError: null,
    currentWorkspaceDetail: null,
    isLoadingWorkspaceDetail: false,
};

const workspacesSlice = createSlice({
    name: 'workspaces',
    initialState,
    reducers: {
        setCurrentWorkspaceId(state, action: PayloadAction<number | null>) {
            state.currentWorkspaceId = action.payload;
            persistCurrentWorkspaceId(action.payload);
        },
        clearWorkspacesError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // [CÁC BUILDER CŨ GIỮ NGUYÊN]
        builder.addCase(fetchWorkspaces.pending, (state) => {
            state.isLoadingWorkspaces = true;
            state.error = null;
        });
        builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
            state.isLoadingWorkspaces = false;
            state.listWorkspaces = action.payload;
            const ids = action.payload.map((w) => w.workspace_id);
            if (ids.length === 0) {
                state.currentWorkspaceId = null;
                persistCurrentWorkspaceId(null);
                return;
            }
            if (
                state.currentWorkspaceId != null &&
                !ids.includes(state.currentWorkspaceId)
            ) {
                state.currentWorkspaceId = ids[0]!;
                persistCurrentWorkspaceId(ids[0]!);
            }
            if (state.currentWorkspaceId == null) {
                state.currentWorkspaceId = ids[0]!;
                persistCurrentWorkspaceId(ids[0]!);
            }
        });
        builder.addCase(fetchWorkspaces.rejected, (state, action) => {
            state.isLoadingWorkspaces = false;
            state.error = action.payload || action.error.message || 'Failed to fetch workspaces';
        });

        builder.addCase(addWorkspace.pending, (state) => {
            state.error = null;
        });
        builder.addCase(addWorkspace.fulfilled, (state, action) => {
            state.listWorkspaces.push(action.payload);
            state.currentWorkspaceId = action.payload.workspace_id;
            persistCurrentWorkspaceId(action.payload.workspace_id);
        });
        builder.addCase(addWorkspace.rejected, (state, action) => {
            state.error = action.payload || action.error.message || 'Failed to create workspace';
        });

        builder.addCase(removeWorkspace.fulfilled, (state, action) => {
            state.listWorkspaces = state.listWorkspaces.filter(
                (w) => w.workspace_id !== action.payload,
            );
            if (state.currentWorkspaceId === action.payload) {
                const next = state.listWorkspaces[0]?.workspace_id ?? null;
                state.currentWorkspaceId = next;
                persistCurrentWorkspaceId(next);
            }
        });
        builder.addCase(removeWorkspace.rejected, (state, action) => {
            state.error = action.payload || action.error.message || 'Failed to delete workspace';
        });

        builder.addCase(sendInvitations.pending, (state) => {
            state.isSendingInvitations = true;
            state.error = null;
        });
        builder.addCase(sendInvitations.fulfilled, (state) => {
            state.isSendingInvitations = false;
        });
        builder.addCase(sendInvitations.rejected, (state, action) => {
            state.isSendingInvitations = false;
            state.error = action.payload || action.error.message || 'Failed to send invitations';
        });

        builder.addCase(respondToInvitations.pending, (state) => {
            state.isRespondingInvitation = true;
            state.error = null;
        });
        builder.addCase(respondToInvitations.fulfilled, (state) => {
            state.isRespondingInvitation = false;
        });
        builder.addCase(respondToInvitations.rejected, (state, action) => {
            state.isRespondingInvitation = false;
            state.error = action.payload || action.error.message || 'Failed to respond to invitation';
        });
        
        builder.addCase(fetchWorkspaceMembers.pending, (state) => {
            state.isLoadingWorkspaceMembers = true;
            state.workspaceMembersError = null;
        });
        builder.addCase(fetchWorkspaceMembers.fulfilled, (state, action) => {
            state.isLoadingWorkspaceMembers = false;
            state.listWorkspaceMembers = action.payload;
        });
        builder.addCase(fetchWorkspaceMembers.rejected, (state, action) => {
            state.isLoadingWorkspaceMembers = false;
            state.workspaceMembersError = action.payload || action.error.message || 'Failed to fetch workspace members';
        });

        builder.addCase(fetchVerifyInvitation.pending, (state) => {
            state.isVerifyingInvitation = true;
            state.verifyInvitationError = null;
            state.verifyInvitationData = null; 
        });
        builder.addCase(fetchVerifyInvitation.fulfilled, (state, action) => {
            state.isVerifyingInvitation = false;
            state.verifyInvitationData = action.payload; 
        });
        builder.addCase(fetchVerifyInvitation.rejected, (state, action) => {
            state.isVerifyingInvitation = false;
            state.verifyInvitationError = action.payload || action.error?.message || 'Failed to verify invitation';
        });

        // fetchWorkspaceById
        builder.addCase(fetchWorkspaceById.pending, (state) => {
            state.isLoadingWorkspaceDetail = true;
            state.updateWorkspaceError = null;
        });
        builder.addCase(fetchWorkspaceById.fulfilled, (state, action) => {
            state.isLoadingWorkspaceDetail = false;
            state.currentWorkspaceDetail = action.payload;
        });
        builder.addCase(fetchWorkspaceById.rejected, (state, action) => {
            state.isLoadingWorkspaceDetail = false;
            state.updateWorkspaceError = action.payload || action.error.message || 'Failed to fetch workspace detail';
        });

        // editWorkspace
        builder.addCase(editWorkspace.pending, (state) => {
            state.isUpdatingWorkspace = true;
            state.updateWorkspaceError = null;
        });
        builder.addCase(editWorkspace.fulfilled, (state, action) => {
            state.isUpdatingWorkspace = false;
            state.currentWorkspaceDetail = action.payload;
            // Cập nhật workspace trong danh sách
            const idx = state.listWorkspaces.findIndex(
                (w) => w.workspace_id === action.payload.workspace_id,
            );
            if (idx !== -1) state.listWorkspaces[idx] = action.payload;
        });
        builder.addCase(editWorkspace.rejected, (state, action) => {
            state.isUpdatingWorkspace = false;
            state.updateWorkspaceError = action.payload || action.error.message || 'Failed to update workspace';
        });

        // Xoá toàn bộ workspaces state khi logout để tránh lộ dữ liệu sang user khác
        builder.addMatcher(
            (action) => action.type === 'auth/fetchSignOut/fulfilled',
            (state) => {
                state.listWorkspaces = [];
                state.currentWorkspaceId = null;
                state.listWorkspaceMembers = [];
                state.error = null;
                state.currentWorkspaceDetail = null;
                persistCurrentWorkspaceId(null);
            }
        );
    },
});

export const { setCurrentWorkspaceId, clearWorkspacesError } = workspacesSlice.actions;
export default workspacesSlice.reducer;