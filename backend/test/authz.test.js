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
