// Việc 6: gửi lại cùng idempotency_key (kể cả song song) chỉ áp dụng một lần; phiếu duyệt không đoán sự cố từ ghi chú.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, sql, makeIncident, makeTask } from './helpers.js';
import { U, WS } from './fixtures.js';

let wf, state;
before(async () => {
  await start();
  wf = (await sql("SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW'")).rows[0].workflow_id;
  state = Object.fromEntries((await sql('SELECT code, state_id FROM workflow_states WHERE workflow_id = $1', [wf])).rows.map((r) => [r.code, r.state_id]));
});
after(stop);

test('hai lần gửi song song cùng khoá: chỉ chuyển trạng thái một lần', async () => {
  const inc = await makeIncident(WS.A.id, U.memberA.id);
  const task = (await sql('SELECT task_id FROM incidents WHERE incident_id = $1', [inc])).rows[0].task_id;
  await sql('UPDATE tasks SET workflow_id = $1, current_state_id = $2 WHERE task_id = $3', [wf, state.ASSIGNED, task]);
  const action = { idempotency_key: `k-${task}`, action_type: 'WORKFLOW_TRANSITION', payload: { task_id: task, to_state_id: state.IN_PROGRESS } };
  const [a, b] = await Promise.all([1, 2].map(() => api('POST', '/sync/batch', { as: U.managerA, body: { actions: [action] } })));
  const statuses = [a, b].map((r) => (r.body.data ?? r.body.results ?? r.body)[0].status).sort();
  // Request thứ hai tới khi request đầu đang chạy (IN_PROGRESS) hoặc đã xong (ALREADY_APPLIED); không bao giờ áp dụng lần nữa
  assert.equal(statuses.filter((x) => x === 'APPLIED').length, 1, JSON.stringify([a.body, b.body]));
  assert.ok(['ALREADY_APPLIED', 'IN_PROGRESS'].includes(statuses.find((x) => x !== 'APPLIED')), JSON.stringify(statuses));
  const logs = (await sql("SELECT count(*)::int n FROM activity_logs WHERE task_id = $1 AND action = 'WORKFLOW_TRANSITION'", [task])).rows[0].n;
  assert.equal(logs, 1);
});

test('khoá của người khác không lộ dữ liệu', async () => {
  const task = await makeTask(WS.A.id, U.memberA.id);
  await sql("INSERT INTO offline_sync_logs (user_id, idempotency_key, action_type, payload, base_version, server_version) VALUES ($1, 'khoa-rieng', 'X', '{\"bi_mat\":1}', 1, 1)", [U.memberA.id]);
  const res = await api('POST', '/sync/batch', { as: U.managerB, body: { actions: [{ idempotency_key: 'khoa-rieng', action_type: 'WORKFLOW_TRANSITION', payload: { task_id: task } }] } });
  assert.doesNotMatch(JSON.stringify(res.body), /bi_mat/);
});

test('ghi chú nhắc "sự cố #N" không tác động sự cố N khi duyệt', async () => {
  const victim = await makeIncident(WS.A.id, U.memberA.id);
  const task = await makeTask(WS.A.id, U.memberA.id, 'REQUEST');
  const ap = (await sql("INSERT INTO approvals (task_id, status, request_note) VALUES ($1, 'PENDING', $2) RETURNING approval_id", [task, `Xin vật tư cho sự cố #${victim}`])).rows[0].approval_id;
  const before = (await sql('SELECT t.current_state_id FROM incidents i JOIN tasks t ON t.task_id = i.task_id WHERE i.incident_id = $1', [victim])).rows[0];
  const res = await api('POST', `/approvals/${ap}/decision`, { as: U.managerA, body: { status: 'APPROVED' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const after = (await sql('SELECT t.current_state_id FROM incidents i JOIN tasks t ON t.task_id = i.task_id WHERE i.incident_id = $1', [victim])).rows[0];
  assert.deepEqual(after, before);
  assert.equal(res.body.data?.incident ?? null, null);
});

test('khoá đang xử lý: báo IN_PROGRESS; khoá kẹt quá 5 phút được nhả cho lần gửi sau', async () => {
  const task = await makeTask(WS.A.id, U.memberA.id);
  const action = (key) => ({ idempotency_key: key, action_type: 'WORKFLOW_TRANSITION', payload: { task_id: task } });
  await sql("INSERT INTO offline_sync_logs (user_id, idempotency_key, action_type, payload, base_version, server_version, status) VALUES ($1, 'dang-chay', 'X', '{}', 1, 1, 'PROCESSING')", [U.managerA.id]);
  await sql("INSERT INTO offline_sync_logs (user_id, idempotency_key, action_type, payload, base_version, server_version, status, applied_at) VALUES ($1, 'ket', 'X', '{}', 1, 1, 'PROCESSING', now() - interval '10 minutes')", [U.managerA.id]);
  const res = await api('POST', '/sync/batch', { as: U.managerA, body: { actions: [action('dang-chay'), action('ket')] } });
  assert.deepEqual(res.body.data.map((r) => r.status), ['IN_PROGRESS', 'IN_PROGRESS'], JSON.stringify(res.body));
  assert.equal((await sql("SELECT count(*)::int n FROM offline_sync_logs WHERE idempotency_key = 'ket'")).rows[0].n, 0);
  assert.equal((await sql("SELECT count(*)::int n FROM offline_sync_logs WHERE idempotency_key = 'dang-chay'")).rows[0].n, 1);
});
