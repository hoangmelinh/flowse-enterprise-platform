import { beApi } from '../callApi';
import type { NotificationData } from '@/store/modules/notifications';

export const getNotifications = async (params?: {
    limit?: number;
    offset?: number;
}): Promise<{ notifications: NotificationData[]; unreadCount: number }> => {
    return beApi.get(`/notifications`, { params });
};

/**
 * Lấy thông báo cho tab "Mentions": assign + deadline.
 * Tự động trigger tạo deadline notification phía backend khi gọi.
 */
export const getMentionNotifications = async (params?: {
    limit?: number;
    offset?: number;
}): Promise<{ notifications: NotificationData[]; unreadCount: number }> => {
    return beApi.get(`/notifications/mentions`, { params });
};

export const markNotificationAsRead = async (notificationId: number): Promise<NotificationData> => {
    return beApi.patch(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
    return beApi.patch(`/notifications/read-all`);
};

export const deleteNotification = async (notificationId: number): Promise<void> => {
    return beApi.delete(`/notifications/${notificationId}`);
};
