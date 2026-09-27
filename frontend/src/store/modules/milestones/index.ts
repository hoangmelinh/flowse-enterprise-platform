import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getMilestonesBySpace,
    getMilestonesByList,
    getMilestoneById,
    createMilestoneInList,
    updateMilestone,
    deleteMilestone,
} from '@/api/milestones';

export interface MilestoneData {
    milestone_id: number;
    space_id: number;
    list_id: number | null;
    name: string;
    description: string | null;
    status: 'on_track' | 'at_risk' | 'completed' | 'cancelled';
    color: string | null;
    due_date: string | null;
    created_by: number;
    creator_name: string | null;
    total_tasks: number;
    done_tasks: number;
    created_at: string;
    updated_at: string;
}

export interface MilestonesState {
    listMilestones: MilestoneData[];
    selectedMilestone: MilestoneData | null;
    isLoadingMilestones: boolean;
    errorMilestones: string | null;
    isCreatingMilestone: boolean;
    errorCreatingMilestone: string | null;
    isUpdatingMilestone: boolean;
    errorUpdatingMilestone: string | null;
    isDeletingMilestone: boolean;
    errorDeletingMilestone: string | null;
}

export const fetchMilestonesBySpace = createAsyncThunk<MilestoneData[], number>(
    'milestones/fetchMilestonesBySpace',
    async (spaceId, { rejectWithValue }) => {
        try {
            const response = await getMilestonesBySpace(spaceId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch milestones');
        }
    },
);

export const fetchMilestonesByList = createAsyncThunk<MilestoneData[], number>(
    'milestones/fetchMilestonesByList',
    async (listId, { rejectWithValue }) => {
        try {
            const response = await getMilestonesByList(listId);
            return response;
        } catch (error: unknown) {
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch milestones');
        }
    },
);

export const fetchMilestoneById = createAsyncThunk<MilestoneData, number>(
    'milestones/fetchMilestoneById',
    async (milestoneId, { rejectWithValue }) => {
        try {
            const response = await getMilestoneById(milestoneId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch milestone');
        }
    },
);

export const fetchCreateMilestone = createAsyncThunk<
    MilestoneData,
    {
        listId: number;
        name: string;
        description?: string | null;
        status?: 'on_track' | 'at_risk' | 'completed' | 'cancelled';
        color?: string;
        dueDate?: string | null;
    }
>(
    'milestones/createMilestone',
    async ({ listId, ...body }, { rejectWithValue }) => {
        try {
            const response = await createMilestoneInList(listId, body);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create milestone');
        }
    },
);

export const fetchUpdateMilestone = createAsyncThunk<
    MilestoneData,
    {
        milestoneId: number;
        name?: string;
        description?: string | null;
        status?: 'on_track' | 'at_risk' | 'completed' | 'cancelled';
        color?: string;
        dueDate?: string | null;
    }
>(
    'milestones/updateMilestone',
    async ({ milestoneId, ...body }, { rejectWithValue }) => {
        try {
            const response = await updateMilestone(milestoneId, body);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update milestone');
        }
    },
);

export const fetchDeleteMilestone = createAsyncThunk<number, number>(
    'milestones/deleteMilestone',
    async (milestoneId, { rejectWithValue }) => {
        try {
            await deleteMilestone(milestoneId);
            return milestoneId;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete milestone');
        }
    },
);

const initialState: MilestonesState = {
    listMilestones: [],
    selectedMilestone: null,
    isLoadingMilestones: false,
    errorMilestones: null,
    isCreatingMilestone: false,
    errorCreatingMilestone: null,
    isUpdatingMilestone: false,
    errorUpdatingMilestone: null,
    isDeletingMilestone: false,
    errorDeletingMilestone: null,
};

export const milestonesSlice = createSlice({
    name: 'milestones',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMilestonesBySpace.pending, (state) => {
                state.isLoadingMilestones = true;
                state.errorMilestones = null;
            })
            .addCase(fetchMilestonesBySpace.fulfilled, (state, action) => {
                state.isLoadingMilestones = false;
                state.listMilestones = action.payload;
            })
            .addCase(fetchMilestonesBySpace.rejected, (state, action) => {
                state.isLoadingMilestones = false;
                state.errorMilestones = action.payload as string;
            })

            .addCase(fetchMilestonesByList.pending, (state) => {
                state.isLoadingMilestones = true;
                state.errorMilestones = null;
            })
            .addCase(fetchMilestonesByList.fulfilled, (state, action) => {
                state.isLoadingMilestones = false;
                state.listMilestones = action.payload;
            })
            .addCase(fetchMilestonesByList.rejected, (state, action) => {
                state.isLoadingMilestones = false;
                state.errorMilestones = action.payload as string;
            })

            .addCase(fetchMilestoneById.fulfilled, (state, action) => {
                state.selectedMilestone = action.payload;
            })

            .addCase(fetchCreateMilestone.pending, (state) => {
                state.isCreatingMilestone = true;
                state.errorCreatingMilestone = null;
            })
            .addCase(fetchCreateMilestone.fulfilled, (state, action) => {
                state.isCreatingMilestone = false;
                state.listMilestones.push(action.payload);
            })
            .addCase(fetchCreateMilestone.rejected, (state, action) => {
                state.isCreatingMilestone = false;
                state.errorCreatingMilestone = action.payload as string;
            })

            .addCase(fetchUpdateMilestone.pending, (state) => {
                state.isUpdatingMilestone = true;
                state.errorUpdatingMilestone = null;
            })
            .addCase(fetchUpdateMilestone.fulfilled, (state, action) => {
                state.isUpdatingMilestone = false;
                const index = state.listMilestones.findIndex(m => m.milestone_id === action.payload.milestone_id);
                if (index !== -1) {
                    state.listMilestones[index] = action.payload;
                }
            })
            .addCase(fetchUpdateMilestone.rejected, (state, action) => {
                state.isUpdatingMilestone = false;
                state.errorUpdatingMilestone = action.payload as string;
            })

            .addCase(fetchDeleteMilestone.pending, (state) => {
                state.isDeletingMilestone = true;
                state.errorDeletingMilestone = null;
            })
            .addCase(fetchDeleteMilestone.fulfilled, (state, action) => {
                state.isDeletingMilestone = false;
                state.listMilestones = state.listMilestones.filter(m => m.milestone_id !== action.payload);
            })
            .addCase(fetchDeleteMilestone.rejected, (state, action) => {
                state.isDeletingMilestone = false;
                state.errorDeletingMilestone = action.payload as string;
            });
    },
});



export default milestonesSlice.reducer;
