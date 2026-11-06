import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { loadModule } from '../../../../test/loadModule.cjs';

const config = { demo: false };
const navigations: unknown[][] = [];
let state: any;
const row = { id: 12, who: 'Minh Anh', title: 'Việc mới', sub: 'Minh Anh', kind: 'task', unread: true, entityType: 'task', entityId: 47 };
const routes = loadModule(fileURLToPath(new URL('../../../core/constants/routes.ts', import.meta.url)));
const fixtures = loadModule(fileURLToPath(new URL('../../../data/demo/fixtures.ts', import.meta.url)));
const { InboxScreen } = loadModule(fileURLToPath(new URL('./InboxScreens.tsx', import.meta.url)), {
  react: { ...React, useState: (initial: unknown) => [initial, () => {}], useMemo: (fn: any) => fn(), useCallback: (fn: any) => fn() },
  'react-native': { StyleSheet: { create: (x: any) => x }, View: 'View', ScrollView: 'ScrollView', RefreshControl: 'RefreshControl', ActivityIndicator: 'ActivityIndicator' },
  '@react-navigation/native': { useNavigation: () => ({ navigate: (...args: unknown[]) => navigations.push(args) }), useFocusEffect: () => {} },
  'lucide-react-native': { Bell: 'Bell', WifiOff: 'WifiOff' },
  '../../../core/theme': { space: {}, useColors: () => ({}) },
  '../../../core/constants/routes': routes,
  '../../../core/config': { __esModule: true, default: config },
  '../../../data/demo/fixtures': fixtures,
  '../../state/useNotifications': { useNotifications: () => state },
  '../../components/ui': new Proxy({}, { get: (_, key) => key }),
});

const elements = (node: any): any[] => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(elements) : [node, ...elements(node.props?.children)];
const render = () => elements(InboxScreen());
test.beforeEach(() => {
  config.demo = false; navigations.length = 0;
  state = { notifications: [row], unreadCount: 81, isLoading: false, isError: false, isRefetching: false,
    refetch: () => {}, markRead: { mutate: () => {}, reset: () => {} }, markAllRead: { mutate: () => {}, reset: () => {} } };
});

test('hiện số server và kéo xuống tải lại trong chế độ thật', () => {
  const tree = render();
  assert.equal(tree.find((n) => n.type === 'ScreenHeader').props.caption, '81 chưa đọc');
  let refreshed = false;
  state.refetch = () => { refreshed = true; };
  render().find((n) => n.type === 'ScrollView').props.refreshControl.props.onRefresh();
  assert.equal(refreshed, true);
});

test('bấm thông báo task đánh dấu đã đọc rồi mở đúng chi tiết việc', () => {
  const ids: number[] = [];
  state.markRead.mutate = (id: number, callbacks: any) => { ids.push(id); callbacks.onSuccess(); };
  render().find((n) => n.props.n?.id === 12).props.onPress();
  assert.deepEqual(ids, [12]);
  assert.deepEqual(navigations, [[routes.Routes.WORK_ITEM_DETAIL, { workItemId: 47 }]]);
});

test('đã đọc thì mở việc ngay; entity khác không mở nhầm việc', () => {
  state.notifications = [{ ...row, unread: false }];
  render().find((n) => n.props.n).props.onPress();
  assert.equal(navigations.length, 1);
  navigations.length = 0;
  state.notifications = [{ ...row, unread: false, entityType: 'project' }];
  render().find((n) => n.props.n).props.onPress();
  assert.equal(navigations.length, 0);
});

test('hiện trạng thái tải, trống và lỗi có nút thử lại', () => {
  state.isLoading = true; state.notifications = [];
  assert.ok(render().some((n) => n.type === 'ActivityIndicator'));
  state.isLoading = false;
  assert.ok(render().some((n) => n.type === 'EmptyState'));
  state.isError = true; state.error = new Error('Bạn không có quyền thực hiện hành động này.');
  const error = render().find((n) => n.type === 'EmptyState');
  assert.equal(error.props.body, state.error.message);
  assert.equal(error.props.onAction, state.refetch);
});

test('lỗi đánh dấu đã đọc hiện trong màn', () => {
  state.markRead.error = new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
  assert.equal(render().find((n) => n.type === 'Banner').props.text, state.markRead.error.message);
});

test('demo giữ nguyên danh sách mẫu, caption và không gắn kéo tải API', () => {
  config.demo = true;
  const tree = render();
  assert.equal(tree.find((n) => n.type === 'ScreenHeader').props.caption, '3 chưa đọc');
  assert.deepEqual(tree.filter((n) => n.props.n).map((n) => n.props.n), fixtures.notifications);
  assert.equal(tree.find((n) => n.type === 'ScrollView').props.refreshControl, undefined);
});
