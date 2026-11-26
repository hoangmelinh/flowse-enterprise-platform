// Hai người thao tác cùng lúc trên một việc: một người thắng, người kia nhận 409 kèm lý do; PUT không vượt quy trình.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, sql, makeIncident } from './helpers.js';
import { U, WS } from './fixtures.js';

let wf, state, taskA;
const row = async (id) => (await sql('SELECT name, version, current_state_id FROM tasks WHERE task_id = $1', [id])).rows[0];

before(async () => {
  await start();
  wf = (await sql("SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW'")).rows[0].workflow_id;
  state = Object.fromEntries((await sql('SELECT code, state_id FROM workflow_states WHERE workflow_id = $1', [wf])).rows.map((r) => [r.code, r.state_id]));
  const space = (await sql('INSERT INTO spaces (workspace_id, name, created_by) VALUES ($1, $2, $3) RETURNING space_id', [WS.A.id, 'Đồng thời', U.adminA.id])).rows[0].space_id;
  const list = (await sql('INSERT INTO lists (space_id, name, created_by) VALUES ($1, $2, $3) RETURNING list_id', [space, 'DS', U.adminA.id])).rows[0].list_id;
  taskA = (await sql("INSERT INTO tasks (list_id, name, created_by, version) VALUES ($1, 'Gốc', $2, 1) RETURNING task_id", [list, U.adminA.id])).rows[0].task_id;
});
after(stop);

test('hai quản lý cùng bấm hoàn tất: một người thành công, người kia 409 kèm trạng thái hiện tại', async () => {
  const inc = await makeIncident(WS.A.id, U.memberA.id);
  const task = (await sql('SELECT task_id FROM incidents WHERE incident_id = $1', [inc])).rows[0].task_id;
  await sql('UPDATE tasks SET workflow_id = $1, current_state_id = $2, version = 5 WHERE task_id = $3', [wf, state.WAITING_VERIFY, task]);
  const press = (who) => api('POST', `/workflows/tasks/${task}/transition`, { as: who, body: { to_state_id: state.RESOLVED, base_version: 5 } });
  const results = await Promise.all([press(U.managerA), press(U.adminA)]);
  const codes = results.map((r) => r.status).sort();
  assert.deepEqual(codes, [200, 409], JSON.stringify(results.map((r) => r.body)));
  assert.match(results.find((r) => r.status === 409).body.message, /người khác cập nhật/);
  assert.equal((await row(task)).version, 6);
});

test('PUT không đổi được trạng thái quy trình hay tự đặt version', async () => {
  await sql('UPDATE tasks SET workflow_id = $1, current_state_id = $2 WHERE task_id = $3', [wf, state.IN_PROGRESS, taskA]);
  const res = await api('PUT', `/tasks/${taskA}`, { as: U.memberA, body: { name: 'Sửa tên', current_state_id: state.CLOSED, workflow_id: null } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const r = await row(taskA);
  assert.equal(r.current_state_id, state.IN_PROGRESS);
  assert.equal(r.name, 'Sửa tên');
});

test('hai lần sửa cùng một phiên bản: một lần ghi, lần kia 409; không gửi version thì vẫn ghi như cũ', async () => {
  const v = (await row(taskA)).version;
  const edit = (who, name) => api('PUT', `/tasks/${taskA}`, { as: who, body: { name, version: v } });
  const results = await Promise.all([edit(U.managerA, 'Bản của Manager'), edit(U.adminA, 'Bản của Admin')]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409], JSON.stringify(results.map((r) => r.body)));
  const after = await row(taskA);
  assert.equal(after.version, v + 1);
  assert.equal(after.name, results.find((r) => r.status === 200).body.name);
  assert.equal((await api('PUT', `/tasks/${taskA}`, { as: U.adminA, body: { name: 'Không kèm version' } })).status, 200);
});
