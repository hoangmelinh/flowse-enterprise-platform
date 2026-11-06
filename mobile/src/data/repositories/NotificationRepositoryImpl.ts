import { AuthError, NetworkError, PermissionError } from '../../core/errors/AppError';
import { Notification, NotificationPage } from '../../domain/entities/notification';
import apiClient from '../api/apiClient';

interface NotificationResponse {
  notification_id: number;
  actor_name?: string | null;
  actor_username?: string | null;
  content: string;
  type: string;
  is_read: boolean;
  entity_type: string | null;
  entity_id: number | null;
  created_at: string;
}

export class NotificationRepositoryImpl {
  async getNotifications(limit = 50, offset = 0): Promise<NotificationPage> {
    try {
      // API trả trực tiếp { notifications, unreadCount }, không bọc data.
      const res = await apiClient.get<{ notifications: NotificationResponse[]; unreadCount: number }>(
        '/notifications', { params: { limit, offset } },
      );
      return { notifications: res.data.notifications.map((n) => this.mapToNotification(n)), unreadCount: res.data.unreadCount };
    } catch (error) {
      throw this.readableError(error);
    }
  }

  async markAsRead(id: number): Promise<Notification> {
    try {
      const res = await apiClient.patch<NotificationResponse>(`/notifications/${id}/read`);
      return this.mapToNotification(res.data);
    } catch (error) {
      throw this.readableError(error);
    }
  }

  async markAllAsRead(): Promise<number> {
    try {
      const res = await apiClient.patch<{ message: string; count: number }>('/notifications/read-all');
      return res.data.count;
    } catch (error) {
      throw this.readableError(error);
    }
  }

  private mapToNotification(n: NotificationResponse): Notification {
    const who = n.actor_name || n.actor_username || 'Hệ thống';
    return {
      id: n.notification_id, who, title: n.content, sub: who,
      kind: n.type === 'task_assigned' || n.type === 'task_deadline' ? 'task' : n.type,
      unread: !n.is_read, entityType: n.entity_type, entityId: n.entity_id, createdAt: n.created_at,
    };
  }

  private readableError(error: unknown): Error {
    if (error instanceof AuthError) return new AuthError();
    if (error instanceof PermissionError) return new PermissionError();
    if (error instanceof NetworkError) return new NetworkError();
    return new Error('Không thể cập nhật thông báo. Vui lòng thử lại.');
  }
}
