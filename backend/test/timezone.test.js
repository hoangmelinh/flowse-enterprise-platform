// Hạn lưu theo giờ Việt Nam (timestamp không múi giờ): việc hạn 1 giờ trước phải là quá hạn, kể cả khi database chạy UTC.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, sql, makeTask } from './helpers.js';
import { U, WS } from './fixtures.js';

before(start);
after(stop);

test('việc hạn một giờ trước được tính quá hạn', async () => {
  const task = await makeTask(WS.A.id, U.memberA.id, 'TASK', 'Hạn một giờ trước');
  await sql('UPDATE tasks SET due_date = $1 WHERE task_id = $2', [new Date(Date.now() - 3600 * 1000), task]);
  const { findOverdueTasksForAi } = await import('../src/models/AI.js');
  const overdue = await findOverdueTasksForAi(U.memberA.id, {});
  assert.ok(overdue.some((t) => t.task_id === task), JSON.stringify(overdue.map((t) => [t.name, t.due_date])));
});
