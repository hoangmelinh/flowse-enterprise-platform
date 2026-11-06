import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import * as React from 'react';
import { loadModule } from '../../../test/loadModule.cjs';

const filename = fileURLToPath(new URL('./AppNavigator.tsx', import.meta.url));
const config = { demo: false };
let unreadCount = 81;
let approvalCount = 7;
let role = 'VP';
const effects: (() => any)[] = [];
const removed: unknown[] = [];
const mocks: Record<string, unknown> = {
  react: { ...React, useEffect: (fn: () => any) => effects.push(fn) },
  'expo-secure-store': {},
  'react-native': { StyleSheet: {} },
  '@react-navigation/native': { useNavigation: () => ({}) },
  '@react-navigation/native-stack': { createNativeStackNavigator: () => ({ Navigator: 'Root', Screen: 'StackScreen' }) },
  '@react-navigation/bottom-tabs': { createBottomTabNavigator: () => ({ Navigator: 'Tabs', Screen: 'TabScreen' }) },
  '@tanstack/react-query': { useQueryClient: () => ({ removeQueries: (filter: unknown) => removed.push(filter) }) },
  'lucide-react-native': {},
  '../../core/config': { __esModule: true, default: config },
  '../../core/constants/routes': loadModule(fileURLToPath(new URL('../../core/constants/routes.ts', import.meta.url))),
  '../../data/demo/fixtures': { approvals: [{ id: 1 }, { id: 2 }] },
  '../../core/theme': { useColors: () => ({}), text: { micro: {} } },
  '../state/authStore': { useAuthStore: () => ({ token: 'test', isInitialized: true }) },
  '../state/prefsStore': { usePrefs: () => false },
  '../state/useHomeRole': { useHomeRole: () => role },
  '../state/useNotifications': { useNotifications: () => ({ unreadCount }) },
  '../state/useApprovals': { useApprovals: () => ({ data: Array.from({ length: approvalCount }, (_, id) => ({ id, status: 'PENDING' })) }) },
};
// Không nạp module native hoặc các màn ngoài phạm vi vào test thanh tab.
for (const match of readFileSync(filename, 'utf8').matchAll(/from '(\.\.\/screens\/[^']+)'/g)) {
  mocks[match[1]] = new Proxy({}, { get: (_, key) => String(key) });
}
const { AppNavigator } = loadModule(filename, mocks);
const elements = (node: any): any[] => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(elements) : [node, ...elements(node.props?.children)];
const renderTabs = () => {
  const main = elements(AppNavigator()).find((n) => n.props.name === 'MainTabs');
  return elements(main.props.component());
};
const badge = () => renderTabs().find((n) => n.props.name === 'Inbox').props.options.tabBarBadge;

test('badge thật dùng tổng chưa đọc và ẩn khi bằng không; demo giữ badge cũ', () => {
  assert.equal(badge(), 81);
  unreadCount = 0;
  assert.equal(badge(), undefined);
  config.demo = true;
  assert.equal(badge(), 4);
  config.demo = false;
});

test('rời phiên đăng nhập xóa cache thông báo và phiếu duyệt', () => {
  effects.length = 0;
  renderTabs();
  const cleanupEffect = effects.find((fn) => fn.toString().includes('removeQueries'));
  assert.ok(cleanupEffect);
  cleanupEffect()();
  assert.deepEqual(removed, [{ queryKey: ['notifications'] }, { queryKey: ['pending-approvals'] }]);
});

test('badge Duyệt dùng số phiếu thật, cập nhật khi hết phiếu và giữ mẫu ở demo', () => {
  role = 'TP';
  const approvalBadge = () => renderTabs().find((n) => n.props.name === 'TabApprovals').props.options.tabBarBadge;
  assert.equal(approvalBadge(), 7);
  approvalCount = 0;
  assert.equal(approvalBadge(), undefined);
  config.demo = true;
  assert.equal(approvalBadge(), 2);
  config.demo = false; role = 'VP';
});
