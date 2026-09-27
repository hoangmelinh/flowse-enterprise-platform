import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getSprintsBySpace,
    getSprintById,
    createSprint,
    updateSprint,
    deleteSprint,
} from '@/api/sprints';

export interface SprintData {
    sprint_id: number;
    space_id: number;
    name: string;
    description: string | null;
    goal: string | null;
    status: 'planning' | 'active' | 'completed' | 'cancelled';
    velocity: number | null;
    start_date: string | null;
    end_date: string | null;
    created_by: number;
    creator_name: string | null;
    total_tasks: number;
    done_tasks: number;
    total_story_points: number;
    completed_story_points: number;
    created_at: string;
    updated_at: string;
}

export interface SprintsState {
    listSprints: SprintData[];
    selectedSprint: SprintData | null;
    isLoadingSprints: boolean;
    errorSprints: string | null;
    isCreatingSprint: boolean;
    errorCreatingSprint: string | null;
    isUpdatingSprint: boolean;
    errorUpdatingSprint: string | null;
    isDeletingSprint: boolean;
    errorDeletingSprint: string | null;
}

export const fetchSprintsBySpace = createAsyncThunk<SprintData[], number>(
    'sprints/fetchSprintsBySpace',
    async (spaceId, { rejectWithValue }) => {
        try {
            const response = await getSprintsBySpace(spaceId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch sprints');
        }
    },
);

export const fetchSprintById = createAsyncThunk<SprintData, number>(
    'sprints/fetchSprintById',
    async (sprintId, { rejectWithValue }) => {
        try {
            const response = await getSprintById(sprintId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch sprint');
        }
    },
);

export const fetchCreateSprint = createAsyncThunk<
    SprintData,
    {
        spaceId: number;
        name: string;
        description?: string;
        goal?: string;
        status?: 'planning' | 'active' | 'completed' | 'cancelled';
        startDate?: string;
        endDate?: string;
    }
>(
    'sprints/createSprint',
    async ({ spaceId, ...body }, { rejectWithValue }) => {
        try {
            const response = await createSprint(spaceId, body);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create sprint');
        }
    },
);

export const fetchUpdateSprint = createAsyncThunk<
    SprintData,
    {
        sprintId: number;
        name?: string;
        description?: string;
        goal?: string;
        status?: 'planning' | 'active' | 'completed' | 'cancelled';
        velocity?: number;
        startDate?: string;
        endDate?: string;
    }
>(
    'sprints/updateSprint',
    async ({ sprintId, ...body }, { rejectWithValue }) => {
        try {
            const response = await updateSprint(sprintId, body);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update sprint');
        }
    },
);

export const fetchDeleteSprint = createAsyncThunk<number, number>(
    'sprints/deleteSprint',
    async (sprintId, { rejectWithValue }) => {
        try {
            await deleteSprint(sprintId);
            return sprintId;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete sprint');
        }
    },
);

const initialState: SprintsState = {
    listSprints: [],
    selectedSprint: null,
    isLoadingSprints: false,
    errorSprints: null,
    isCreatingSprint: false,
    errorCreatingSprint: null,
    isUpdatingSprint: false,
    errorUpdatingSprint: null,
    isDeletingSprint: false,
    errorDeletingSprint: null,
};

export const sprintsSlice = createSlice({
    name: 'sprints',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchSprintsBySpace.pending, (state) => {
                state.isLoadingSprints = true;
                state.errorSprints = null;
            })
            .addCase(fetchSprintsBySpace.fulfilled, (state, action) => {
                state.isLoadingSprints = false;
                state.listSprints = action.payload;
            })
            .addCase(fetchSprintsBySpace.rejected, (state, action) => {
                state.isLoadingSprints = false;
                state.errorSprints = action.payload as string;
            })

            .addCase(fetchSprintById.fulfilled, (state, action) => {
                state.selectedSprint = action.payload;
            })

            .addCase(fetchCreateSprint.pending, (state) => {
                state.isCreatingSprint = true;
                state.errorCreatingSprint = null;
            })
            .addCase(fetchCreateSprint.fulfilled, (state, action) => {
                state.isCreatingSprint = false;
                state.listSprints.push(action.payload);
            })
            .addCase(fetchCreateSprint.rejected, (state, action) => {
                state.isCreatingSprint = false;
                state.errorCreatingSprint = action.payload as string;
            })

            .addCase(fetchUpdateSprint.pending, (state) => {
                state.isUpdatingSprint = true;
                state.errorUpdatingSprint = null;
            })
            .addCase(fetchUpdateSprint.fulfilled, (state, action) => {
                state.isUpdatingSprint = false;
                const index = state.listSprints.findIndex(s => s.sprint_id === action.payload.sprint_id);
                if (index !== -1) {
                    state.listSprints[index] = action.payload;
                }
            })
            .addCase(fetchUpdateSprint.rejected, (state, action) => {
                state.isUpdatingSprint = false;
                state.errorUpdatingSprint = action.payload as string;
            })

            .addCase(fetchDeleteSprint.pending, (state) => {
                state.isDeletingSprint = true;
                state.errorDeletingSprint = null;
            })
            .addCase(fetchDeleteSprint.fulfilled, (state, action) => {
                state.isDeletingSprint = false;
                state.listSprints = state.listSprints.filter(s => s.sprint_id !== action.payload);
            })
            .addCase(fetchDeleteSprint.rejected, (state, action) => {
                state.isDeletingSprint = false;
                state.errorDeletingSprint = action.payload as string;
            });
    },
});



export default sprintsSlice.reducer;
