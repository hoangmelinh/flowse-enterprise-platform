// Việc 2: admin/manager chỉ có quyền trong workspace của mình.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, sql } from './helpers.js';
import { U, WS } from './fixtures.js';

let taskB; // việc thuộc công ty B
const pendingApproval = async () =>
  (await sql("INSERT INTO approvals (task_id, step_order, status) VALUES ($1, 1, 'PENDING') RETURNING approval_id", [taskB])).rows[0].approval_id;

before(async () => {
  await start();
  const space = (await sql('INSERT INTO spaces (workspace_id, name, created_by) VALUES ($1, $2, $3) RETURNING space_id', [WS.B.id, 'Không gian B', U.adminB.id])).rows[0].space_id;
  const list = (await sql('INSERT INTO lists (space_id, name, created_by) VALUES ($1, $2, $3) RETURNING list_id', [space, 'Danh sách B', U.adminB.id])).rows[0].list_id;
  taskB = (await sql("INSERT INTO tasks (list_id, name, created_by, work_item_type) VALUES ($1, 'Mua vật tư B', $2, 'REQUEST') RETURNING task_id", [list, U.adminB.id])).rows[0].task_id;
});
after(stop);

test('manager công ty A không duyệt được phiếu của công ty B', async () => {
  const id = await pendingApproval();
  const res = await api('POST', `/approvals/${id}/decision`, { as: U.managerA, body: { status: 'APPROVED' } });
  assert.equal(res.status, 403, JSON.stringify(res.body));
  const row = (await sql('SELECT status FROM approvals WHERE approval_id = $1', [id])).rows[0];
  assert.equal(row.status, 'PENDING');
});

test('admin công ty A không duyệt được phiếu của công ty B', async () => {
  const id = await pendingApproval();
  const res = await api('POST', `/approvals/${id}/decision`, { as: U.adminA, body: { status: 'APPROVED' } });
  assert.equal(res.status, 403, JSON.stringify(res.body));
});

test('manager công ty B duyệt được phiếu của công ty mình', async () => {
  const id = await pendingApproval();
  const res = await api('POST', `/approvals/${id}/decision`, { as: U.managerB, body: { status: 'APPROVED' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
});

test('vai trò của manager A trên việc của công ty B không có admin/manager', async () => {
  const { default: WorkflowEngine } = await import('../src/core/WorkflowEngine.js');
  const roles = await WorkflowEngine.getUserRolesForTask(U.managerA.id, taskB);
  assert.ok(!roles.includes('manager') && !roles.includes('admin'), roles.join(','));
  const own = await WorkflowEngine.getUserRolesForTask(U.managerB.id, taskB);
  assert.ok(own.includes('manager'), own.join(','));
});

test('danh sách chờ duyệt không lộ phiếu của công ty khác', async () => {
  const id = await pendingApproval();
  const ids = (res) => (res.body.data ?? res.body).map((a) => a.approval_id);
  const a = await api('GET', '/approvals/pending', { as: U.managerA });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.ok(!ids(a).includes(id));
  const b = await api('GET', '/approvals/pending', { as: U.managerB });
  assert.ok(ids(b).includes(id));
});

test('duyệt lần hai: 409 kèm câu tiếng Việt (không phải lỗi 500); phiếu không tồn tại: 404', async () => {
  const id = await pendingApproval();
  assert.equal((await api('POST', `/approvals/${id}/decision`, { as: U.managerB, body: { status: 'APPROVED' } })).status, 200);
  const again = await api('POST', `/approvals/${id}/decision`, { as: U.adminB, body: { status: 'REJECTED', decisionNote: 'muộn' } });
  assert.equal(again.status, 409, JSON.stringify(again.body));
  assert.match(again.body.message, /đã được người khác xử lý/);
  assert.equal((await sql('SELECT status FROM approvals WHERE approval_id = $1', [id])).rows[0].status, 'APPROVED');
  assert.equal((await api('POST', '/approvals/999999/decision', { as: U.managerB, body: { status: 'APPROVED' } })).status, 404);
});

test('space_id trong body không đổi được nơi kiểm quyền sang công ty khác', async () => {
  const spaceA = (await sql('INSERT INTO spaces (workspace_id, name, created_by) VALUES ($1, $2, $3) RETURNING space_id', [WS.A.id, 'Không gian A', U.adminA.id])).rows[0].space_id;
  const put = await api('PUT', `/tasks/${taskB}`, { as: U.adminA, body: { space_id: spaceA, name: 'Bị sửa' } });
  assert.equal(put.status, 403, JSON.stringify(put.body));
  const del = await api('DELETE', `/tasks/${taskB}`, { as: U.adminA, body: { space_id: spaceA } });
  assert.equal(del.status, 403, JSON.stringify(del.body));
  const row = (await sql('SELECT name, deleted_at FROM tasks WHERE task_id = $1', [taskB])).rows[0];
  assert.deepEqual([row.name, row.deleted_at], ['Mua vật tư B', null]);
  const space = await api('POST', `/spaces/workspaces/${WS.B.id}`, { as: U.adminA, body: { space_id: spaceA, name: 'Lọt vào B' } });
  assert.equal(space.status, 403, JSON.stringify(space.body));
});

test('admin chỉ quản trị thiết bị và phòng ban của công ty mình', async () => {
  const deptB = (await sql("INSERT INTO departments (name, code, workspace_id) VALUES ('Tổ B', 'T_B', $1) RETURNING department_id", [WS.B.id])).rows[0].department_id;
  const assetB = (await sql("INSERT INTO assets (asset_code, name, qr_token, department_id, workspace_id) VALUES ('B-01', 'Máy B', 'qr-b-01', $1, $2) RETURNING asset_id", [deptB, WS.B.id])).rows[0].asset_id;

  assert.equal((await api('POST', `/assets/${assetB}/rotate-qr`, { as: U.adminA })).status, 403);
  assert.equal((await sql('SELECT qr_token FROM assets WHERE asset_id = $1', [assetB])).rows[0].qr_token, 'qr-b-01');
  assert.equal((await api('PUT', `/departments/${deptB}`, { as: U.adminA, body: { name: 'Bị sửa' } })).status, 403);
  assert.equal((await api('POST', '/assets', { as: U.adminA, body: { asset_code: 'A-LỌT', name: 'x', department_id: deptB } })).status, 403);
  assert.equal((await api('POST', '/departments', { as: U.adminA, body: { name: 'x', code: 'X_B', workspace_id: WS.B.id } })).status, 403);
  assert.equal((await api('POST', '/departments', { as: U.managerA, body: { name: 'x', code: 'X_A' } })).status, 403);

  const own = await api('POST', '/departments', { as: U.adminA, body: { name: 'Tổ A', code: 'T_A' } });
  assert.equal(own.status, 201, JSON.stringify(own.body));
  assert.equal(own.body.data.workspace_id, WS.A.id);
  assert.equal((await api('POST', `/assets/${assetB}/rotate-qr`, { as: U.adminB })).status, 200);
});
