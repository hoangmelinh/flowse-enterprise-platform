import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    getNotifications,
    getMentionNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
} from '@/api/notifications';

export interface NotificationData {
    notification_id: number;
    user_id: number;
    type: string;
    title?: string;
    message?: string;
    content: string;
    is_read: boolean;
    related_task_id: number | null;
    related_space_id: number | null;
    created_at: string;
    actor_name?: string | null;
    actor_avatar?: string | null;
    task_name?: string | null;
}

export interface NotificationsState {
    listNotifications: NotificationData[];
    unreadCount: number;
    isLoadingNotifications: boolean;
    errorNotifications: string | null;
    // Mentions tab state
    mentionNotifications: NotificationData[];
    mentionUnreadCount: number;
    isLoadingMentions: boolean;
    errorMentions: string | null;
    // Mark / Delete
    isMarkingRead: boolean;
    errorMarkingRead: string | null;
    isDeletingNotification: boolean;
    errorDeletingNotification: string | null;
}

export const fetchNotifications = createAsyncThunk<
    { notifications: NotificationData[]; unreadCount: number },
    { limit?: number; offset?: number } | undefined
>(
    'notifications/fetchNotifications',
    async (params, { rejectWithValue }) => {
        try {
            const response = await getNotifications(params);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch notifications');
        }
    },
);

export const fetchMentionNotifications = createAsyncThunk<
    { notifications: NotificationData[]; unreadCount: number },
    { limit?: number; offset?: number } | undefined
>(
    'notifications/fetchMentionNotifications',
    async (params, { rejectWithValue }) => {
        try {
            const response = await getMentionNotifications(params);
            return response;
        } catch (error: unknown) {
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch mention notifications');
        }
    },
);

export const fetchMarkNotificationAsRead = createAsyncThunk<NotificationData, number>(
    'notifications/markAsRead',
    async (notificationId, { rejectWithValue }) => {
        try {
            const response = await markNotificationAsRead(notificationId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to mark notification as read');
        }
    },
);

export const fetchMarkAllNotificationsAsRead = createAsyncThunk<void>(
    'notifications/markAllAsRead',
    async (_, { rejectWithValue }) => {
        try {
            await markAllNotificationsAsRead();
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to mark all notifications as read');
        }
    },
);

export const fetchDeleteNotification = createAsyncThunk<number, number>(
    'notifications/deleteNotification',
    async (notificationId, { rejectWithValue }) => {
        try {
            await deleteNotification(notificationId);
            return notificationId;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete notification');
        }
    },
);

const initialState: NotificationsState = {
    listNotifications: [],
    unreadCount: 0,
    isLoadingNotifications: false,
    errorNotifications: null,
    mentionNotifications: [],
    mentionUnreadCount: 0,
    isLoadingMentions: false,
    errorMentions: null,
    isMarkingRead: false,
    errorMarkingRead: null,
    isDeletingNotification: false,
    errorDeletingNotification: null,
};

export const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoadingNotifications = true;
                state.errorNotifications = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoadingNotifications = false;
                state.listNotifications = action.payload.notifications;
                state.unreadCount = action.payload.unreadCount ?? 0;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.isLoadingNotifications = false;
                state.errorNotifications = action.payload as string;
            })

            .addCase(fetchMentionNotifications.pending, (state) => {
                state.isLoadingMentions = true;
                state.errorMentions = null;
            })
            .addCase(fetchMentionNotifications.fulfilled, (state, action) => {
                state.isLoadingMentions = false;
                state.mentionNotifications = action.payload.notifications;
                state.mentionUnreadCount = action.payload.unreadCount ?? 0;
            })
            .addCase(fetchMentionNotifications.rejected, (state, action) => {
                state.isLoadingMentions = false;
                state.errorMentions = action.payload as string;
            })

            .addCase(fetchMarkNotificationAsRead.pending, (state) => {
                state.isMarkingRead = true;
                state.errorMarkingRead = null;
            })
            .addCase(fetchMarkNotificationAsRead.fulfilled, (state, action) => {
                state.isMarkingRead = false;
                const index = state.listNotifications.findIndex(n => n.notification_id === action.payload.notification_id);
                if (index !== -1) {
                    state.listNotifications[index] = action.payload;
                }
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            })
            .addCase(fetchMarkNotificationAsRead.rejected, (state, action) => {
                state.isMarkingRead = false;
                state.errorMarkingRead = action.payload as string;
            })

            .addCase(fetchMarkAllNotificationsAsRead.pending, (state) => {
                state.isMarkingRead = true;
                state.errorMarkingRead = null;
            })
            .addCase(fetchMarkAllNotificationsAsRead.fulfilled, (state) => {
                state.isMarkingRead = false;
                state.listNotifications = state.listNotifications.map(n => ({ ...n, is_read: true }));
                state.unreadCount = 0;
            })
            .addCase(fetchMarkAllNotificationsAsRead.rejected, (state, action) => {
                state.isMarkingRead = false;
                state.errorMarkingRead = action.payload as string;
            })

            .addCase(fetchDeleteNotification.pending, (state) => {
                state.isDeletingNotification = true;
                state.errorDeletingNotification = null;
            })
            .addCase(fetchDeleteNotification.fulfilled, (state, action) => {
                state.isDeletingNotification = false;
                const deleted = state.listNotifications.find(n => n.notification_id === action.payload);
                if (deleted && !deleted.is_read) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
                state.listNotifications = state.listNotifications.filter(n => n.notification_id !== action.payload);
            })
            .addCase(fetchDeleteNotification.rejected, (state, action) => {
                state.isDeletingNotification = false;
                state.errorDeletingNotification = action.payload as string;
            });
    },
});



export default notificationsSlice.reducer;
