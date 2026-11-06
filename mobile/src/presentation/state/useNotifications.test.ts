import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { QueryClient, InfiniteQueryObserver } from '@tanstack/react-query';
import { loadModule } from '../../../test/loadModule.cjs';

const config = { demo: false };
let user: { id: number } | null = { id: 1 };
let options: any;
let mutations: any[];
let client: QueryClient;
let reads: number[];
const item = { id: 12, unread: true, who: 'Minh Anh', entityType: 'task', entityId: 47 };
const { useNotifications } = loadModule(fileURLToPath(new URL('./useNotifications.ts', import.meta.url)), {
  '@tanstack/react-query': {
    useQueryClient: () => client,
    useInfiniteQuery: (value: any) => { options = value; return { data: client.getQueryData(value.queryKey) }; },
    useMutation: (value: any) => { mutations.push(value); return value; },
  },
  '../../core/config': { __esModule: true, default: config },
  './authStore': { useAuthStore: (select: any) => select({ user }) },
  '../../data/repositories/NotificationRepositoryImpl': { NotificationRepositoryImpl: class {
    async getNotifications(limit: number, offset: number) {
      reads.push(offset);
      return { notifications: offset === 0 ? Array.from({ length: limit }, (_, i) => ({ ...item, id: i + 1 })) : [], unreadCount: 81 };
    }
    async markAsRead() { return { ...item, unread: false, who: 'Hệ thống' }; }
    async markAllAsRead() { return 81; }
  } },
});

test.beforeEach(() => {
  config.demo = false; user = { id: 1 }; mutations = []; reads = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
});
test.afterEach(() => client.clear());

test('demo và chưa đăng nhập không gọi API; cache tách theo tài khoản', () => {
  config.demo = true; useNotifications(); assert.equal(options.enabled, false);
  config.demo = false; user = null; useNotifications(); assert.equal(options.enabled, false);
  user = { id: 1 }; useNotifications(); const firstKey = options.queryKey;
  assert.equal(options.enabled, true);
  user = { id: 2 }; useNotifications(); assert.notDeepEqual(options.queryKey, firstKey);
});

test('phân trang dùng offset, dừng khi hết và badge dùng tổng server', async () => {
  useNotifications();
  const observer = new InfiniteQueryObserver(client, options);
  await observer.refetch();
  assert.equal(useNotifications().unreadCount, 81);
  await observer.fetchNextPage();
  assert.deepEqual(reads, [0, 50]);
  assert.equal(observer.getCurrentResult().hasNextPage, false);
  observer.destroy();
});

test('đọc một thông báo cập nhật cache, giữ tên actor và chỉ giảm badge một lần', async () => {
  useNotifications();
  client.setQueryData(options.queryKey, { pages: [{ notifications: [item], unreadCount: 81 }], pageParams: [0] });
  const mutation = mutations[0];
  await mutation.onMutate(12);
  const result = await mutation.mutationFn(12);
  await mutation.onSuccess(result, 12);
  assert.equal(useNotifications().unreadCount, 80);
  assert.equal(useNotifications().notifications[0].who, 'Minh Anh');
  assert.equal(useNotifications().notifications[0].unread, false);
  await mutation.onSuccess(result, 12);
  assert.equal(useNotifications().unreadCount, 80);
});

test('đọc tất cả cập nhật cả trang và badge', async () => {
  useNotifications();
  client.setQueryData(options.queryKey, { pages: [
    { notifications: [item], unreadCount: 81 },
    { notifications: [{ ...item, id: 13 }], unreadCount: 81 },
  ], pageParams: [0, 50] });
  const mutation = mutations[1];
  await mutation.onMutate();
  await mutation.onSuccess(await mutation.mutationFn());
  const state = useNotifications();
  assert.equal(state.unreadCount, 0);
  assert.ok(state.notifications.every((n: any) => !n.unread));
});

test('không sửa trạng thái đã đọc trước khi server xác nhận', async () => {
  useNotifications();
  client.setQueryData(options.queryKey, { pages: [{ notifications: [item], unreadCount: 81 }], pageParams: [0] });
  await mutations[0].onMutate(12);
  assert.equal(useNotifications().unreadCount, 81);
  assert.equal(useNotifications().notifications[0].unread, true);
});

test('lượt tải bắt đầu trong lúc đánh dấu đọc không ghi đè kết quả thành công', async () => {
  useNotifications();
  const page = { notifications: [item], unreadCount: 81 };
  client.setQueryData(options.queryKey, { pages: [page], pageParams: [0] });
  const mutation = mutations[0];
  await mutation.onMutate(12);
  let finishRefresh: (value: unknown) => void;
  const refresh = client.fetchInfiniteQuery({ ...options, queryFn: () => new Promise((resolve) => { finishRefresh = resolve; }) }).catch(() => {});
  await mutation.onSuccess(await mutation.mutationFn(12), 12);
  finishRefresh!(page);
  await refresh;
  assert.equal(useNotifications().unreadCount, 80);
  assert.equal(useNotifications().notifications[0].unread, false);
});
