import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getSpacesForWorkspace,
    createSpace,
    updateSpace,
    getSpaceDetails,
} from '@/api/spaces';

/* ── Types khớp 100% với response của BE ── */

export interface FolderData {
    folder_id: number;
    space_id: number;
    name: string;
    position: number;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    lists: ListData[];
}

export interface ListData {
    list_id: number;
    folder_id: number | null;
    space_id: number;
    name: string;
    position: number;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}
export interface SprintData {
    sprint_id: number;
    space_id: number;
    name: string;
    description: string;
    goal: string;
    status: string;
    velocity: number | null;
    start_date: string;
    end_date: string;
    created_by: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    creator_name: string;
    total_tasks: string; 
    done_tasks: string;  
    total_story_points: string; 
    completed_story_points: string; 
}
export interface SpaceDetail {
    spaceId: number;
    name: string;
    description: string;
    color: string;
    icon: string | null;
    isPrivate: boolean;
    folders: FolderData[];
    lists: ListData[];
    sprints: SprintData[]; 
}

/** Shape trả về bởi GET /spaces/spacesDetails/:id */
export type SpaceDetailSingle = SpaceDetail;

/** Shape cũ — vẫn giữ để tương thích với createSpace / updateSpace */
export interface SpaceData {
    space_id: number;
    workspace_id: number;
    name: string;
    description: string;
    color: string;
    is_private: boolean;
    create_by: number | null;
    create_at: string;
    update_by: number | null;
    update_at: string;
    deleted_at: string | null;
}

export interface SpacesState {
    listSpaces: SpaceDetail[];          // ← giờ dùng SpaceDetail[] thay vì SpaceData[]
    isLoadingSpaces: boolean;
    errorSpaces: string | null;
    isCreatingSpaces: boolean;
    errorCreating: string | null;
    isUpdatingSpaces: boolean;
    errorUpdating: string | null;
    spaceDetails: SpaceDetail | null;
    isLoadingSpacesDetails: boolean;
}

/* ── Thunks ── */

export const fetchSpacesForWorkspace = createAsyncThunk<SpaceDetail[], number>(
    'spaces/fetchSpacesForWorkspace',
    async (workspace_id, { rejectWithValue }) => {
        try {
            const response = await getSpacesForWorkspace(workspace_id) as { data?: SpaceDetail[] } | SpaceDetail[];
            // BE trả về { status: "success", data: SpaceDetail[] }
            return ((response as { data?: SpaceDetail[] }).data ?? response) as SpaceDetail[];
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch spaces');
        }
    },
);

export const fetchCreateSpace = createAsyncThunk<
    SpaceData,
    { workspace_id: number; name: string; description: string; color: string; is_private?: boolean }
>(
    'spaces/createSpace',
    async ({ workspace_id, name, description, color, is_private }, { rejectWithValue }) => {
        try {
            return await createSpace(workspace_id, name, description, color, is_private);
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create space');
        }
    },
);

export const fetchUpdateSpace = createAsyncThunk<
    SpaceData,
    { space_id: number; name: string; description: string; color: string }
>(
    'spaces/updateSpace',
    async ({ space_id, name, description, color }, { rejectWithValue }) => {
        try {
            return await updateSpace(space_id, name, description, color);
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update space');
        }
    },
);

export const fetchGetSpaceDetails = createAsyncThunk<SpaceDetail, number>(
    'spaces/getSpaceDetails',
    async (space_id, { rejectWithValue }) => {
        try {
            const response = await getSpaceDetails(space_id) as { data?: SpaceDetail } | SpaceDetail;
            // BE trả về { status: "success", data: { spaceId, ... } }
            return ((response as { data?: SpaceDetail }).data ?? response) as SpaceDetail;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch space details');
        }
    },
);

/* ── Slice ── */

const initialState: SpacesState = {
    listSpaces: [],
    spaceDetails: null,
    isLoadingSpaces: false,
    errorSpaces: null,
    isCreatingSpaces: false,
    errorCreating: null,
    isUpdatingSpaces: false,
    errorUpdating: null,
    isLoadingSpacesDetails: false,
};

export const spacesSlice = createSlice({
    name: 'spaces',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            /* fetchSpacesForWorkspace */
            .addCase(fetchSpacesForWorkspace.pending, (state) => {
                state.isLoadingSpaces = true;
                state.errorSpaces = null;
            })
            .addCase(fetchSpacesForWorkspace.fulfilled, (state, action) => {
                state.isLoadingSpaces = false;
                state.listSpaces = action.payload;
            })
            .addCase(fetchSpacesForWorkspace.rejected, (state, action) => {
                state.isLoadingSpaces = false;
                state.errorSpaces = action.payload as string;
            })

            /* fetchCreateSpace — sau khi tạo, refetch để lấy tree mới */
            .addCase(fetchCreateSpace.pending, (state) => {
                state.isCreatingSpaces = true;
                state.errorCreating = null;
            })
            .addCase(fetchCreateSpace.fulfilled, (state, action) => {
                state.isCreatingSpaces = false;
                const raw = action.payload;
                state.listSpaces.push({
                    spaceId: raw.space_id,
                    name: raw.name,
                    description: raw.description,
                    color: raw.color || '#0058be',
                    icon: null,
                    isPrivate: raw.is_private,
                    folders: [],
                    lists: [],
                    sprints: [],
                });
            })
            .addCase(fetchCreateSpace.rejected, (state, action) => {
                state.isCreatingSpaces = false;
                state.errorCreating = action.payload as string;
            })

            /* fetchUpdateSpace */
            .addCase(fetchUpdateSpace.pending, (state) => {
                state.isUpdatingSpaces = true;
                state.errorUpdating = null;
            })
            .addCase(fetchUpdateSpace.fulfilled, (state, action) => {
                state.isUpdatingSpaces = false;
                const raw = action.payload;
                const idx = state.listSpaces.findIndex((s) => s.spaceId === raw.space_id);
                if (idx !== -1) {
                    state.listSpaces[idx] = {
                        ...state.listSpaces[idx],
                        name: raw.name,
                        description: raw.description,
                        color: raw.color,
                    };
                }
            })
            .addCase(fetchUpdateSpace.rejected, (state, action) => {
                state.isUpdatingSpaces = false;
                state.errorUpdating = action.payload as string;
            })

            /* fetchGetSpaceDetails */
            .addCase(fetchGetSpaceDetails.pending, (state) => {
                state.isLoadingSpacesDetails = true;
            })
            .addCase(fetchGetSpaceDetails.fulfilled, (state, action) => {
                state.isLoadingSpacesDetails = false;
                state.spaceDetails = action.payload;
            })
            .addCase(fetchGetSpaceDetails.rejected, (state) => {
                state.isLoadingSpacesDetails = false;
                state.spaceDetails = null;
            });
    },
});


export default spacesSlice.reducer;