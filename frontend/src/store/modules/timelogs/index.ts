import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getMyTimeLogs,
    getRunningTimer,
    getTimeLogsByTask,
    getTotalTimeByTask,
    startTimer,
    stopTimer,
    deleteTimeLog,
} from '@/api/timelogs';

export interface TimeLogData {
    time_log_id: number;
    task_id: number;
    user_id: number;
    started_at: string;
    stopped_at: string | null;
    duration_secs: number | null;
    note: string | null;
    created_at: string;
    // Joined fields from backend queries
    task_name?: string;
    username?: string;
    user_name?: string;
}

export interface TimeLogsState {
    myTimeLogs: TimeLogData[];
    taskTimeLogs: TimeLogData[];
    runningTimer: TimeLogData | null;
    totalSeconds: number | null;
    isLoadingTimeLogs: boolean;
    errorTimeLogs: string | null;
    isStartingTimer: boolean;
    errorStartingTimer: string | null;
    isStoppingTimer: boolean;
    errorStoppingTimer: string | null;
    isDeletingTimeLog: boolean;
    errorDeletingTimeLog: string | null;
}

export const fetchMyTimeLogs = createAsyncThunk<TimeLogData[]>(
    'timelogs/fetchMyTimeLogs',
    async (_, { rejectWithValue }) => {
        try {
            const response = await getMyTimeLogs();
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch time logs');
        }
    },
);

export const fetchRunningTimer = createAsyncThunk<TimeLogData | null>(
    'timelogs/fetchRunningTimer',
    async (_, { rejectWithValue }) => {
        try {
            const response = await getRunningTimer();
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } })    .response?.data?.message || 'Failed to fetch running timer');
        }
    },
);

export const fetchTimeLogsByTask = createAsyncThunk<TimeLogData[], number>(
    'timelogs/fetchTimeLogsByTask',
    async (taskId, { rejectWithValue }) => {
        try {
            const response = await getTimeLogsByTask(taskId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch time logs for task');
        }
    },
);

export const fetchTotalTimeByTask = createAsyncThunk<{ total_seconds: number }, number>(
    'timelogs/fetchTotalTimeByTask',
    async (taskId, { rejectWithValue }) => {
        try {
            const response = await getTotalTimeByTask(taskId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } })    .response?.data?.message || 'Failed to fetch total time');
        }
    },
);

export const fetchStartTimer = createAsyncThunk<
    TimeLogData,
    { taskId: number; note?: string }
>(
    'timelogs/startTimer',
    async ({ taskId, note }, { rejectWithValue }) => {
        try {
            const response = await startTimer(taskId, note);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to start timer');
        }
    },
);

export const fetchStopTimer = createAsyncThunk<TimeLogData, number>(
    'timelogs/stopTimer',
    async (timeLogId, { rejectWithValue }) => {
        try {
            const response = await stopTimer(timeLogId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } })    .response?.data?.message || 'Failed to stop timer');
        }
    },
);

export const fetchDeleteTimeLog = createAsyncThunk<number, number>(
    'timelogs/deleteTimeLog',
    async (timeLogId, { rejectWithValue }) => {
        try {
            await deleteTimeLog(timeLogId);
            return timeLogId;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete time log');
        }
    },
);

const initialState: TimeLogsState = {
    myTimeLogs: [],
    taskTimeLogs: [],
    runningTimer: null,
    totalSeconds: null,
    isLoadingTimeLogs: false,
    errorTimeLogs: null,
    isStartingTimer: false,
    errorStartingTimer: null,
    isStoppingTimer: false,
    errorStoppingTimer: null,
    isDeletingTimeLog: false,
    errorDeletingTimeLog: null,
};

export const timeLogsSlice = createSlice({
    name: 'timelogs',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyTimeLogs.pending, (state) => {
                state.isLoadingTimeLogs = true;
                state.errorTimeLogs = null;
            })
            .addCase(fetchMyTimeLogs.fulfilled, (state, action) => {
                state.isLoadingTimeLogs = false;
                state.myTimeLogs = action.payload;
            })
            .addCase(fetchMyTimeLogs.rejected, (state, action) => {
                state.isLoadingTimeLogs = false;
                state.errorTimeLogs = action.payload as string;
            })

            .addCase(fetchRunningTimer.fulfilled, (state, action) => {
                state.runningTimer = action.payload;
            })

            .addCase(fetchTimeLogsByTask.pending, (state) => {
                state.isLoadingTimeLogs = true;
                state.errorTimeLogs = null;
            })
            .addCase(fetchTimeLogsByTask.fulfilled, (state, action) => {
                state.isLoadingTimeLogs = false;
                state.taskTimeLogs = action.payload;
            })
            .addCase(fetchTimeLogsByTask.rejected, (state, action) => {
                state.isLoadingTimeLogs = false;
                state.errorTimeLogs = action.payload as string;
            })

            .addCase(fetchTotalTimeByTask.fulfilled, (state, action) => {
                state.totalSeconds = action.payload.total_seconds;
            })

            .addCase(fetchStartTimer.pending, (state) => {
                state.isStartingTimer = true;
                state.errorStartingTimer = null;
            })
            .addCase(fetchStartTimer.fulfilled, (state, action) => {
                state.isStartingTimer = false;
                state.runningTimer = action.payload;
            })
            .addCase(fetchStartTimer.rejected, (state, action) => {
                state.isStartingTimer = false;
                state.errorStartingTimer = action.payload as string;
            })

            .addCase(fetchStopTimer.pending, (state) => {
                state.isStoppingTimer = true;
                state.errorStoppingTimer = null;
            })
            .addCase(fetchStopTimer.fulfilled, (state, action) => {
                state.isStoppingTimer = false;
                state.runningTimer = null;
                state.taskTimeLogs.push(action.payload);
            })
            .addCase(fetchStopTimer.rejected, (state, action) => {
                state.isStoppingTimer = false;
                state.errorStoppingTimer = action.payload as string;
            })

            .addCase(fetchDeleteTimeLog.pending, (state) => {
                state.isDeletingTimeLog = true;
                state.errorDeletingTimeLog = null;
            })
            .addCase(fetchDeleteTimeLog.fulfilled, (state, action) => {
                state.isDeletingTimeLog = false;
                state.taskTimeLogs = state.taskTimeLogs.filter(l => l.time_log_id !== action.payload);
                state.myTimeLogs = state.myTimeLogs.filter(l => l.time_log_id !== action.payload);
            })
            .addCase(fetchDeleteTimeLog.rejected, (state, action) => {
                state.isDeletingTimeLog = false;
                state.errorDeletingTimeLog = action.payload as string;
            });
    },
});



export default timeLogsSlice.reducer;
