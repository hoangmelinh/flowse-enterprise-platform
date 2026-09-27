import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatWithAI } from '@/api/ai';
import type { ChatWithAIResponse } from '@/api/ai';

interface AIState {
    isLoading: boolean;
    error: string | null;
    lastResponse: ChatWithAIResponse | null;
}

const initialState: AIState = {
    isLoading: false,
    error: null,
    lastResponse: null,
};

export const fetchAIChat = createAsyncThunk<
    ChatWithAIResponse,
    { message: string; history: { role: 'user' | 'ai'; content: string }[] }
>(
    'ai/chat',
    async ({ message, history }, { rejectWithValue }) => {
        try {
            const response = await chatWithAI(message, history);
            return response;
        } catch (error: unknown) {
            return rejectWithValue(
                (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'AI request failed',
            );
        }
    },
);


const aiSlice = createSlice({
    name: 'ai',
    initialState,
    reducers: {
        clearAIError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAIChat.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchAIChat.fulfilled, (state, action) => {
                state.isLoading = false;
                state.lastResponse = action.payload;
            })
            .addCase(fetchAIChat.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const { clearAIError } = aiSlice.actions;
export default aiSlice.reducer;
