// Việc 7: tạo việc / sự cố chỉ vào danh sách thuộc công ty của người tạo.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, sql, makeTask } from './helpers.js';
import { U, WS } from './fixtures.js';

let listA, listB;
const listOf = async (task) => (await sql('SELECT list_id FROM tasks WHERE task_id = $1', [task])).rows[0].list_id;
before(async () => {
  await start();
  listA = await listOf(await makeTask(WS.A.id, U.memberA.id));
  listB = await listOf(await makeTask(WS.B.id, U.adminB.id));
});
after(stop);

test('không tạo được việc vào danh sách của công ty khác', async () => {
  const res = await api('POST', '/work-items', { as: U.memberA, body: { title: 'Lén', list_id: listB } });
  assert.equal(res.status, 403, JSON.stringify(res.body));
  const inc = await api('POST', '/work-items', { as: U.memberA, body: { title: 'Lén', list_id: listB, work_item_type: 'INCIDENT' } });
  assert.equal(inc.status, 403, JSON.stringify(inc.body));
});

test('không gửi list_id: việc rơi vào danh sách của công ty mình', async () => {
  const res = await api('POST', '/work-items', { as: U.managerB, body: { title: 'Việc B' } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const ws = (await sql('SELECT sp.workspace_id FROM tasks t JOIN lists l ON l.list_id = t.list_id JOIN spaces sp ON sp.space_id = l.space_id WHERE t.task_id = $1', [res.body.data.task_id])).rows[0].workspace_id;
  assert.equal(ws, WS.B.id);
});

test('tạo việc vào danh sách của công ty mình', async () => {
  const res = await api('POST', '/work-items', { as: U.memberA, body: { title: 'Việc A', list_id: listA } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
});
