import { createSlice } from '@reduxjs/toolkit';

export type appState = Record<string, never>;

const initialState: appState = {
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
    },
});


export default appSlice.reducer;
