import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadModule } from '../../../test/loadModule.cjs';

const errors = loadModule(fileURLToPath(new URL('../../core/errors/AppError.ts', import.meta.url)));
const calls: unknown[][] = [];
let data: unknown;
let failure: unknown;
const apiClient = {
  get: async (...args: unknown[]) => { calls.push(['get', ...args]); if (failure) throw failure; return { data }; },
  post: async (...args: unknown[]) => { calls.push(['post', ...args]); if (failure) throw failure; return { data }; },
};
const { ApprovalRepositoryImpl } = loadModule(fileURLToPath(new URL('./ApprovalRepositoryImpl.ts', import.meta.url)), {
  '../api/apiClient': { __esModule: true, default: apiClient },
  '../../core/errors/AppError': errors,
});
const repo = new ApprovalRepositoryImpl();
const row = {
  approval_id: 17, task_id: 42, task_name: 'Xin linh kiện', task_description: 'Máy đang dừng',
  priority: 'High', work_item_type: 'REQUEST', requester_name: 'Minh Anh', requester_email: 'minhanh@example.test',
  requester_avatar: null, step_order: 2, status: 'PENDING', request_note: 'Cần 2 vòng bi',
  decision_note: null, decided_at: null, created_at: '2026-11-06T01:00:00Z',
};
test.beforeEach(() => { calls.length = 0; failure = undefined; data = { success: true, data: [row] }; });

test('GET pending đọc đúng envelope và không bịa requester_id backend không trả', async () => {
  const [approval] = await repo.getPendingApprovals();
  assert.deepEqual(calls, [['get', '/approvals/pending']]);
  assert.deepEqual(approval, {
    id: 17, taskId: 42, taskTitle: 'Xin linh kiện', taskDescription: 'Máy đang dừng',
    priority: 'High', workItemType: 'REQUEST', requesterName: 'Minh Anh', requesterEmail: 'minhanh@example.test',
    requesterAvatar: undefined, stepOrder: 2, status: 'PENDING', requestNote: 'Cần 2 vòng bi',
    decisionNote: undefined, decidedAt: undefined, createdAt: row.created_at,
  });
});

test('danh sách trống là kết quả hợp lệ', async () => {
  data = { success: true, data: [] };
  assert.deepEqual(await repo.getPendingApprovals(), []);
});

for (const invalid of [{}, { success: false }, { success: true, data: [{ ...row, status: undefined }] }, { success: true, data: [{ ...row, approval_id: null }] }]) {
  test(`dữ liệu không hợp lệ không biến thành phiếu được phép duyệt: ${JSON.stringify(invalid)}`, async () => {
    data = invalid;
    await assert.rejects(() => repo.getPendingApprovals(), /Dữ liệu phê duyệt không hợp lệ/);
  });
}

for (const status of ['APPROVED', 'REJECTED']) {
  test(`POST ${status} đúng đường dẫn và note; đọc bản ghi không có thông tin join`, async () => {
    data = { success: true, data: { approval_id: 17, task_id: 42, step_order: 2, status, decision_note: 'Ghi chú', decided_at: row.created_at, created_at: row.created_at } };
    const result = await repo.makeDecision({ approvalId: 17, status, decisionNote: '  Ghi chú  ' });
    assert.equal(result.id, 17);
    assert.equal(result.status, status);
    assert.equal(result.decisionNote, 'Ghi chú');
    assert.deepEqual(calls, [['post', '/approvals/17/decision', { status, decisionNote: 'Ghi chú' }]]);
  });
}

test('không gửi từ chối thiếu lý do hoặc quyết định không hợp lệ', async () => {
  for (const params of [
    { approvalId: 17, status: 'REJECTED', decisionNote: '   ' },
    { approvalId: 17, status: 'PENDING' },
    { approvalId: -1, status: 'APPROVED' },
  ]) await assert.rejects(() => repo.makeDecision(params));
  assert.deepEqual(calls, []);
});

for (const [error, message, statusCode] of [
  [new errors.PermissionError('Forbidden'), 'Bạn không có quyền xử lý phiếu này.', 403],
  [new errors.ConflictError('Conflict'), 'Phiếu đã được người khác xử lý. Danh sách đang được tải lại.', 409],
  [new errors.AuthError('Unauthenticated'), 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401],
  [new errors.NetworkError('Network Error'), 'Chưa xác nhận được kết quả. Vui lòng kiểm tra mạng và tải lại danh sách trước khi quyết định tiếp.', 0],
]) {
  test(`giữ mã lỗi ${statusCode}, thông báo tiếng Việt và không tự gửi lại`, async () => {
    failure = error;
    await assert.rejects(() => repo.makeDecision({ approvalId: 17, status: 'APPROVED' }), { message, statusCode });
    assert.equal(calls.length, 1);
    await assert.rejects(() => repo.getPendingApprovals(), (err: any) => err.statusCode === statusCode && /[ạệềếượ]/.test(err.message));
  });
}

test('lỗi 500 hiện thông báo an toàn, không đổi thành 409 và không lộ chi tiết server', async () => {
  failure = { response: { status: 500, data: { message: 'Approval record not found or already processed', stack: 'private SQL' } } };
  await assert.rejects(() => repo.makeDecision({ approvalId: 17, status: 'APPROVED' }), (error: any) => {
    assert.notEqual(error.statusCode, 409);
    assert.match(error.message, /Không thể ghi nhận quyết định/);
    assert.doesNotMatch(error.message, /private SQL|Approval record/);
    return true;
  });
  assert.equal(calls.length, 1);
});
