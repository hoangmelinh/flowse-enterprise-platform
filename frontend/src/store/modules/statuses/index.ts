import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getStatusesBySpace,
    getStatusById,
    createTaskStatus,
    updateTaskStatus,
    deleteTaskStatus,
    reorderStatus,
} from '@/api/statuses';

export interface StatusData {
    status_id: number;
    space_id: number;
    status_name: string;
    color: string | null;
    position: number;
    is_done_state: boolean;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface StatusesState {
    listStatuses: StatusData[];
    selectedStatus: StatusData | null;
    isLoadingStatuses: boolean;
    errorStatuses: string | null;
    isCreatingStatus: boolean;
    errorCreatingStatus: string | null;
    isUpdatingStatus: boolean;
    errorUpdatingStatus: string | null;
    isDeletingStatus: boolean;
    errorDeletingStatus: string | null;
}

export const fetchStatusesBySpace = createAsyncThunk<StatusData[], number>(
    'statuses/fetchStatusesBySpace',
    async (spaceId, { rejectWithValue }) => {
        try {
            const response = await getStatusesBySpace(spaceId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch statuses');
        }
    },
);

export const fetchStatusById = createAsyncThunk<StatusData, number>(
    'statuses/fetchStatusById',
    async (statusId, { rejectWithValue }) => {
        try {
            const response = await getStatusById(statusId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch status');
        }
    },
);

export const fetchCreateStatus = createAsyncThunk<
    StatusData,
    { spaceId: number; statusName: string; color?: string; position?: number; isDoneState?: boolean; isDefault?: boolean }
>(
    'statuses/createStatus',
    async ({ spaceId, ...body }, { rejectWithValue }) => {
        try {
            const response = await createTaskStatus(spaceId, body);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create status');
        }
    },
);

export const fetchUpdateStatus = createAsyncThunk<
    StatusData,
    { statusId: number; statusName?: string; color?: string; isDoneState?: boolean }
>(
    'statuses/updateStatus',
    async ({ statusId, ...body }, { rejectWithValue }) => {
        try {
            const response = await updateTaskStatus(statusId, body);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update status');
        }
    },
);

export const fetchDeleteStatus = createAsyncThunk<number, number>(
    'statuses/deleteStatus',
    async (statusId, { rejectWithValue }) => {
        try {
            await deleteTaskStatus(statusId);
            return statusId;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete status');
        }
    },
);

export const fetchReorderStatus = createAsyncThunk<
    StatusData,
    { statusId: number; position: number }
>(
    'statuses/reorderStatus',
    async ({ statusId, position }, { rejectWithValue }) => {
        try {
            const response = await reorderStatus(statusId, position);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to reorder status');
        }
    },
);

const initialState: StatusesState = {
    listStatuses: [],
    selectedStatus: null,
    isLoadingStatuses: false,
    errorStatuses: null,
    isCreatingStatus: false,
    errorCreatingStatus: null,
    isUpdatingStatus: false,
    errorUpdatingStatus: null,
    isDeletingStatus: false,
    errorDeletingStatus: null,
};

export const statusesSlice = createSlice({
    name: 'statuses',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchStatusesBySpace.pending, (state) => {
                state.isLoadingStatuses = true;
                state.errorStatuses = null;
            })
            .addCase(fetchStatusesBySpace.fulfilled, (state, action) => {
                state.isLoadingStatuses = false;
                state.listStatuses = action.payload;
            })
            .addCase(fetchStatusesBySpace.rejected, (state, action) => {
                state.isLoadingStatuses = false;
                state.errorStatuses = action.payload as string;
            })

            .addCase(fetchStatusById.fulfilled, (state, action) => {
                state.selectedStatus = action.payload;
            })

            .addCase(fetchCreateStatus.pending, (state) => {
                state.isCreatingStatus = true;
                state.errorCreatingStatus = null;
            })
            .addCase(fetchCreateStatus.fulfilled, (state, action) => {
                state.isCreatingStatus = false;
                state.listStatuses.push(action.payload);
            })
            .addCase(fetchCreateStatus.rejected, (state, action) => {
                state.isCreatingStatus = false;
                state.errorCreatingStatus = action.payload as string;
            })

            .addCase(fetchUpdateStatus.pending, (state) => {
                state.isUpdatingStatus = true;
                state.errorUpdatingStatus = null;
            })
            .addCase(fetchUpdateStatus.fulfilled, (state, action) => {
                state.isUpdatingStatus = false;
                const index = state.listStatuses.findIndex(s => s.status_id === action.payload.status_id);
                if (index !== -1) {
                    state.listStatuses[index] = action.payload;
                }
            })
            .addCase(fetchUpdateStatus.rejected, (state, action) => {
                state.isUpdatingStatus = false;
                state.errorUpdatingStatus = action.payload as string;
            })

            .addCase(fetchDeleteStatus.pending, (state) => {
                state.isDeletingStatus = true;
                state.errorDeletingStatus = null;
            })
            .addCase(fetchDeleteStatus.fulfilled, (state, action) => {
                state.isDeletingStatus = false;
                state.listStatuses = state.listStatuses.filter(s => s.status_id !== action.payload);
            })
            .addCase(fetchDeleteStatus.rejected, (state, action) => {
                state.isDeletingStatus = false;
                state.errorDeletingStatus = action.payload as string;
            })

            .addCase(fetchReorderStatus.fulfilled, (state, action) => {
                const index = state.listStatuses.findIndex(s => s.status_id === action.payload.status_id);
                if (index !== -1) {
                    state.listStatuses[index] = action.payload;
                }
                state.listStatuses.sort((a, b) => a.position - b.position);
            });
    },
});



export default statusesSlice.reducer;
