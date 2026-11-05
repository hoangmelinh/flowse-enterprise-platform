import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import config from '../../core/config';
import { NotificationPage } from '../../domain/entities/notification';
import { NotificationRepositoryImpl } from '../../data/repositories/NotificationRepositoryImpl';
import { useAuthStore } from './authStore';

const repo = new NotificationRepositoryImpl();
const PAGE_SIZE = 50;

export const useNotifications = () => {
  const userId = useAuthStore((s) => s.user?.id);
  const client = useQueryClient();
  const queryKey = ['notifications', userId];
  const query = useInfiniteQuery({
    queryKey,
    enabled: !config.demo && !!userId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => repo.getNotifications(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, _pages, offset) => lastPage.notifications.length === PAGE_SIZE ? offset + PAGE_SIZE : undefined,
    retry: false,
    staleTime: 0,
    refetchInterval: 30_000,
  });

  // Hủy lượt tải cũ để không ghi đè kết quả vừa đánh dấu đã đọc.
  const cancelRefresh = () => client.cancelQueries({ queryKey });
  const updateRead = async (id?: number) => {
    await cancelRefresh();
    client.setQueryData<InfiniteData<NotificationPage>>(queryKey, (data) => {
      if (!data) return data;
      const wasUnread = data.pages.some((p) => p.notifications.some((n) => n.id === id && n.unread));
      const unreadCount = id === undefined ? 0 : Math.max(0, data.pages[0].unreadCount - Number(wasUnread));
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page, unreadCount,
          notifications: page.notifications.map((n) => id === undefined || n.id === id ? { ...n, unread: false } : n),
        })),
      };
    });
    // Đối chiếu lại tổng chưa đọc nếu có thông báo mới trên server.
    void client.invalidateQueries({ queryKey });
  };
  const markRead = useMutation({
    mutationFn: (id: number) => repo.markAsRead(id),
    onMutate: cancelRefresh,
    onSuccess: (_notification, id) => updateRead(id),
  });
  const markAllRead = useMutation({
    mutationFn: () => repo.markAllAsRead(),
    onMutate: cancelRefresh,
    onSuccess: () => updateRead(),
  });

  return {
    ...query,
    notifications: query.data?.pages.flatMap((p) => p.notifications) ?? [],
    unreadCount: query.data?.pages[0]?.unreadCount ?? 0,
    markRead,
    markAllRead,
  };
};
