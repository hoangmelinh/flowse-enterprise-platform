import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getCommentsByTask, createComment } from '@/api/comments';

export interface CommentData {
    comment_id: number;
    task_id: number;
    user_id: number;
    content: string;
    author_name: string;
    author_avatar: string | null;
    created_at: string;
    updated_at: string;
}

export interface CommentsState {
    listComments: CommentData[];
    isLoadingComments: boolean;
    errorComments: string | null;
    isCreatingComment: boolean;
    errorCreatingComment: string | null;
}

export const fetchCommentsByTask = createAsyncThunk<CommentData[], number>(
    'comments/fetchCommentsByTask',
    async (taskId, { rejectWithValue }) => {
        try {
            const response = await getCommentsByTask(taskId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch comments');
        }
    },
);

export const fetchCreateComment = createAsyncThunk<
    CommentData,
    { taskId: number; content: string; }
>(
    'comments/createComment',
    async ({ taskId, content }, { rejectWithValue }) => {
        try {
            const response = await createComment(taskId, content);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create comment');
        }
    },
);

const initialState: CommentsState = {
    listComments: [],
    isLoadingComments: false,
    errorComments: null,
    isCreatingComment: false,
    errorCreatingComment: null,
};

export const commentsSlice = createSlice({
    name: 'comments',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCommentsByTask.pending, (state) => {
                state.isLoadingComments = true;
                state.errorComments = null;
            })
            .addCase(fetchCommentsByTask.fulfilled, (state, action) => {
                state.isLoadingComments = false;
                state.listComments = action.payload;
            })
            .addCase(fetchCommentsByTask.rejected, (state, action) => {
                state.isLoadingComments = false;
                state.errorComments = action.payload as string;
            })

            .addCase(fetchCreateComment.pending, (state) => {
                state.isCreatingComment = true;
                state.errorCreatingComment = null;
            })
            .addCase(fetchCreateComment.fulfilled, (state, action) => {
                state.isCreatingComment = false;
                state.listComments.push(action.payload);
            })
            .addCase(fetchCreateComment.rejected, (state, action) => {
                state.isCreatingComment = false;
                state.errorCreatingComment = action.payload as string;
            });
    },
});



export default commentsSlice.reducer;
