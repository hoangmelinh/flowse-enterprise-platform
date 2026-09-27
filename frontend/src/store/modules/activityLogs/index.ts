import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getActivitiesByTask, getActivitiesBySpace } from '@/api/activityLogs';
import type { ActivityLog } from '@/types/activityLogs';

// ── State ────────────────────────────────────────────────────────────────────

export interface ActivityLogsState {
    listActivities: ActivityLog[];
    isLoadingActivities: boolean;
    errorActivities: string | null;
}

const initialState: ActivityLogsState = {
    listActivities: [],
    isLoadingActivities: false,
    errorActivities: null,
};

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchActivitiesByTask = createAsyncThunk<
    ActivityLog[],
    number
>(
    'activityLogs/fetchByTask',
    async (taskId, { rejectWithValue }) => {
        try {
            const response = await getActivitiesByTask(taskId);
            return response;
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: { message?: string } } })
                    .response?.data?.message ?? 'Failed to fetch activities',
            );
        }
    },
);

export const fetchActivitiesBySpace = createAsyncThunk<
    ActivityLog[],
    { spaceId: number; limit?: number }
>(
    'activityLogs/fetchBySpace',
    async ({ spaceId, limit = 8 }, { rejectWithValue }) => {
        try {
            const response = await getActivitiesBySpace(spaceId, limit);
            return response;
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: { message?: string } } })
                    .response?.data?.message ?? 'Failed to fetch space activities',
            );
        }
    },
);

// ── Slice ─────────────────────────────────────────────────────────────────────

export const activityLogsSlice = createSlice({
    name: 'activityLogs',
    initialState,
    reducers: {
        clearActivities(state) {
            state.listActivities = [];
            state.errorActivities = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchActivitiesByTask.pending, (state) => {
                state.isLoadingActivities = true;
                state.errorActivities = null;
            })
            .addCase(fetchActivitiesByTask.fulfilled, (state, action) => {
                state.isLoadingActivities = false;
                state.listActivities = action.payload;
            })
            .addCase(fetchActivitiesByTask.rejected, (state, action) => {
                state.isLoadingActivities = false;
                state.errorActivities = action.payload as string;
            })
            // ── fetchActivitiesBySpace ──────────────────────────────────
            .addCase(fetchActivitiesBySpace.pending, (state) => {
                state.isLoadingActivities = true;
                state.errorActivities = null;
            })
            .addCase(fetchActivitiesBySpace.fulfilled, (state, action) => {
                state.isLoadingActivities = false;
                state.listActivities = action.payload;
            })
            .addCase(fetchActivitiesBySpace.rejected, (state, action) => {
                state.isLoadingActivities = false;
                state.errorActivities = action.payload as string;
            });
    },
});

export const { clearActivities } = activityLogsSlice.actions;
export default activityLogsSlice.reducer;
