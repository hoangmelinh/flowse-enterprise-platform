export interface Notification {
  id: number;
  who: string;
  title: string;
  sub: string;
  kind: string;
  unread: boolean;
  entityType: string | null;
  entityId: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPage {
  notifications: Notification[];
  unreadCount: number;
}
