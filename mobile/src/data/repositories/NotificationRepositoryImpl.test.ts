import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadModule } from '../../../test/loadModule.cjs';

const calls: unknown[][] = [];
let response: unknown;
let failure: unknown;
const apiClient = {
  get: async (...args: unknown[]) => { calls.push(['get', ...args]); if (failure) throw failure; return { data: response }; },
  patch: async (...args: unknown[]) => { calls.push(['patch', ...args]); if (failure) throw failure; return { data: response }; },
};
const errors = loadModule(fileURLToPath(new URL('../../core/errors/AppError.ts', import.meta.url)));
const { NotificationRepositoryImpl } = loadModule(fileURLToPath(new URL('./NotificationRepositoryImpl.ts', import.meta.url)), {
  '../api/apiClient': { __esModule: true, default: apiClient },
  '../../core/errors/AppError': errors,
});
const repo = new NotificationRepositoryImpl();
const row = {
  notification_id: 12, actor_name: 'Minh Anh', actor_username: 'minhanh',
  content: 'Bạn được giao việc kiểm tra', type: 'task_assigned',
  entity_type: 'task', entity_id: 47, is_read: false, created_at: '2026-11-06T01:00:00Z',
};

test.beforeEach(() => { calls.length = 0; failure = undefined; });

test('GET đúng đường dẫn, phân trang và chuyển dữ liệu; giữ tổng chưa đọc từ server', async () => {
  response = { notifications: [row], unreadCount: 81 };
  assert.deepEqual(await repo.getNotifications(50, 100), {
    notifications: [{ id: 12, who: 'Minh Anh', title: row.content, sub: 'Minh Anh', kind: 'task',
      unread: true, entityType: 'task', entityId: 47, createdAt: row.created_at }],
    unreadCount: 81,
  });
  assert.deepEqual(calls, [['get', '/notifications', { params: { limit: 50, offset: 100 } }]]);
});

test('danh sách trống và tham số mặc định', async () => {
  response = { notifications: [], unreadCount: 0 };
  assert.deepEqual(await repo.getNotifications(), response);
  assert.deepEqual(calls[0], ['get', '/notifications', { params: { limit: 50, offset: 0 } }]);
});

test('thông báo hệ thống, đã đọc và loại chưa biết vẫn hiển thị được', async () => {
  response = { notifications: [{ ...row, actor_name: null, actor_username: null, is_read: true, type: 'new_type', entity_type: null, entity_id: null }], unreadCount: 0 };
  const n = (await repo.getNotifications()).notifications[0];
  assert.equal(n.who, 'Hệ thống');
  assert.equal(n.kind, 'new_type');
  assert.equal(n.unread, false);
  assert.equal(n.entityId, null);
});

test('PATCH đánh dấu một thông báo trả bản ghi trực tiếp, không có data wrapper', async () => {
  response = { ...row, is_read: true, actor_name: undefined, actor_username: undefined };
  assert.equal((await repo.markAsRead(12)).unread, false);
  assert.deepEqual(calls, [['patch', '/notifications/12/read']]);
});

test('PATCH đánh dấu tất cả đọc và lấy count', async () => {
  response = { message: 'All notifications marked as read', count: 81 };
  assert.equal(await repo.markAllAsRead(), 81);
  assert.deepEqual(calls, [['patch', '/notifications/read-all']]);
});

for (const [name, error, message] of [
  ['mất mạng', new errors.NetworkError('Network Error'), 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.'],
  ['401', new errors.AuthError('User not authenticated'), 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
  ['403', new errors.PermissionError('Forbidden'), 'Bạn không có quyền thực hiện hành động này.'],
  ['máy chủ', new Error('Internal details'), 'Không thể cập nhật thông báo. Vui lòng thử lại.'],
] as const) {
  test(`lỗi ${name} được báo bằng tiếng Việt ở cả ba thao tác`, async () => {
    failure = error;
    for (const action of [() => repo.getNotifications(), () => repo.markAsRead(12), () => repo.markAllAsRead()]) {
      await assert.rejects(action, { message });
    }
  });
}
