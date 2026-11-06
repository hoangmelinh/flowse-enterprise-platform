import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as React from 'react';
import { loadModule } from '../../../../test/loadModule.cjs';

let query: any;
let detail: any;
let state: any[] = [];
let cursor = 0;
const actions: any[] = [];
const navigations: any[] = [];
const row = { id: 17, taskId: 42, status: 'PENDING', taskTitle: 'Xin linh kiện thật', requesterName: 'Minh Anh', taskDescription: 'Máy đang dừng', requestNote: 'Cần 2 vòng bi', stepOrder: 2 };
const config = { demo: false };
const fixtures = loadModule(fileURLToPath(new URL('../../../data/demo/fixtures.ts', import.meta.url)));
const mocks = {
  react: { ...React, useCallback: (fn: any) => fn, useState: (initial: any) => {
    const index = cursor++; if (!(index in state)) state[index] = initial;
    return [state[index], (value: any) => { state[index] = value; }];
  } },
  'react-native': { StyleSheet: { create: (x: any) => x }, View: 'View', ActivityIndicator: 'ActivityIndicator' },
  '@react-navigation/native': { useFocusEffect: () => {} },
  'lucide-react-native': new Proxy({}, { get: (_, key) => String(key) }),
  '../../../core/theme': { space: {}, makeStyles: () => () => ({}) },
  '../../../core/config': { __esModule: true, default: config },
  '../../../core/constants/routes': loadModule(fileURLToPath(new URL('../../../core/constants/routes.ts', import.meta.url))),
  '../../../data/demo/fixtures': fixtures,
  '../../state/useApprovals': { useApprovals: () => query, useApprovalDecision: (id: number) => { assert.equal(id, 17); return detail; } },
  '../../components/ui': new Proxy({}, { get: (_, key) => key }),
  '../../components/anim/FigmaAnim': { FigmaAnim: 'FigmaAnim' },
  '../../state/authStore': { useAuthStore: () => ({ name: 'Test user' }) },
  '../../state/useHomeRole': { useRoleScope: () => ({ unit: 'Demo unit' }) },
};
const live = loadModule(fileURLToPath(new URL('./LiveApprovalScreens.tsx', import.meta.url)), mocks);
const screens = loadModule(fileURLToPath(new URL('./RequestScreens.tsx', import.meta.url)), { ...mocks, './LiveApprovalScreens': live });
const props = { route: { params: { approvalId: 17 } }, navigation: {
  navigate: (...args: any[]) => navigations.push(['navigate', ...args]),
  replace: (...args: any[]) => navigations.push(['replace', ...args]),
  popTo: (...args: any[]) => navigations.push(['popTo', ...args]), goBack: () => {},
} };
const elements = (node: any): any[] => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(elements)
  : [node, ...elements(node.props?.children), ...elements(node.props?.footer)];
const render = (Component: any) => {
  cursor = 0;
  let element = Component(props);
  if (typeof element.type === 'function') element = element.type(element.props);
  return elements(element);
};
const button = (tree: any[], title: string) => tree.find((n) => n.type === 'Button' && n.props.title === title);
test.beforeEach(() => {
  state = []; cursor = 0; actions.length = 0; navigations.length = 0; config.demo = false;
  query = { data: [row], refetch: () => actions.push('refresh'), isLoading: false, isError: false };
  detail = { ...query, approval: row, canDecide: true, busy: false, decision: {},
    refresh: () => actions.push('refresh'), submit: (...args: any[]) => actions.push(args) };
});

test('danh sách thật hiển thị phiếu, kéo tải và mở đúng ID', () => {
  const tree = render(screens.ApprovalsScreen);
  const item = tree.find((n) => n.type === 'Row');
  assert.equal(item.props.title, row.taskTitle);
  tree[0].props.onRefresh();
  item.props.onPress();
  assert.deepEqual(actions, ['refresh']);
  assert.deepEqual(navigations, [['navigate', 'ApprovalDecision', { approvalId: 17 }]]);
});

test('danh sách có loading, empty và lỗi tiếng Việt kèm thử lại', () => {
  query.isLoading = true;
  assert.ok(render(screens.ApprovalsScreen).some((n) => n.type === 'ActivityIndicator'));
  query.isLoading = false; query.data = [];
  assert.ok(render(screens.ApprovalsScreen).some((n) => n.type === 'EmptyState'));
  query.isError = true; query.error = new Error('Bạn không có quyền xử lý phiếu này.');
  const error = render(screens.ApprovalsScreen).find((n) => n.type === 'EmptyState');
  assert.equal(error.props.body, query.error.message);
  assert.equal(error.props.onAction, query.refetch);
});

test('chi tiết dùng phiếu thật, duyệt gửi một quyết định rồi mới mở thành công', () => {
  const tree = render(screens.ApprovalDecisionScreen);
  assert.ok(tree.some((n) => n.props.children === row.taskTitle));
  assert.ok(tree.some((n) => n.props.children === row.requestNote));
  button(tree, 'Duyệt').props.onPress();
  assert.equal(actions[0][0], 'APPROVED');
  assert.equal(navigations.length, 0);
  actions[0][2]();
  assert.equal(navigations[0][1], 'Success');
});

test('không có phiếu hoặc có lỗi quyền thì không hiện nút quyết định', () => {
  detail.approval = undefined; detail.canDecide = false;
  assert.equal(button(render(screens.ApprovalDecisionScreen), 'Duyệt'), undefined);
  detail.approval = row; detail.decision.error = new Error('Bạn không có quyền xử lý phiếu này.');
  const tree = render(screens.ApprovalDecisionScreen);
  assert.equal(button(tree, 'Duyệt'), undefined);
  assert.equal(tree.find((n) => n.type === 'Banner').props.text, detail.decision.error.message);
});

test('409 còn hiện sau khi tải lại loại phiếu khỏi danh sách', () => {
  detail.approval = undefined; detail.canDecide = false;
  detail.decision.error = new Error('Phiếu đã được người khác xử lý. Danh sách đang được tải lại.');
  assert.equal(render(screens.ApprovalDecisionScreen).find((n) => n.type === 'Banner').props.text, detail.decision.error.message);
});

test('đang gửi khóa cả Duyệt và Từ chối', () => {
  detail.busy = true;
  const tree = render(screens.ApprovalDecisionScreen);
  assert.equal(button(tree, 'Duyệt').props.disabled, true);
  assert.equal(button(tree, 'Từ chối').props.disabled, true);
});

test('Từ chối chỉ mở sheet, chưa gửi quyết định', () => {
  button(render(screens.ApprovalDecisionScreen), 'Từ chối').props.onPress();
  assert.deepEqual(navigations, [['navigate', 'RejectReason', { approvalId: 17 }]]);
  assert.deepEqual(actions, []);
});

test('sheet bắt buộc lý do, gửi note đã trim và chỉ báo thành công sau phản hồi', () => {
  button(render(screens.RejectReasonSheet), 'Từ chối yêu cầu').props.onPress();
  assert.deepEqual(actions, []);
  render(screens.RejectReasonSheet).find((n) => n.type === 'Field').props.onChangeText('  Thiếu báo giá  ');
  button(render(screens.RejectReasonSheet), 'Từ chối yêu cầu').props.onPress();
  assert.equal(actions[0][0], 'REJECTED');
  assert.equal(actions[0][1], 'Thiếu báo giá');
  assert.equal(navigations.length, 0);
  actions[0][2]();
  assert.equal(navigations[0][1], 'Success');
});

test('sheet khóa gửi và sửa lý do khi đang gửi; không cho gửi phiếu không còn chờ', () => {
  detail.busy = true;
  const tree = render(screens.RejectReasonSheet);
  assert.equal(button(tree, 'Từ chối yêu cầu').props.disabled, true);
  assert.equal(tree.find((n) => n.type === 'Field').props.editable, false);
  detail.busy = false; detail.canDecide = false; detail.approval = undefined;
  assert.equal(button(render(screens.RejectReasonSheet), 'Từ chối yêu cầu'), undefined);
});

test('demo giữ danh sách mẫu và luồng quyết định cũ', () => {
  config.demo = true;
  const list = render(screens.ApprovalsScreen);
  assert.equal(list.filter((n) => n.type === 'Row' && n.props.leading).length, fixtures.approvals.length);
  assert.equal(list[0].props.onRefresh, undefined);
  state = [];
  button(render(screens.ApprovalDecisionScreen), 'Duyệt').props.onPress();
  assert.equal(navigations[0][1], 'Success');
  assert.deepEqual(actions, []);
});
