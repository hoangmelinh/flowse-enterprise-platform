// Flowse AI chế độ Work: AI đề xuất, người dùng áp dụng; quyền và dữ liệu được kiểm lại lúc áp dụng.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, sql, makeTask } from './helpers.js';
import { U, WS } from './fixtures.js';

let propose, runWork; // nạp sau start() để dùng đúng schema test
let spaceA, listA2, statusDone, taskB;
before(async () => {
  await start();
  ({ proposeAction: propose } = await import('../src/models/AiAction.js'));
  ({ runWork } = await import('../src/controllers/aiWorkController.js'));
  spaceA = (await sql("INSERT INTO spaces (workspace_id, name, created_by) VALUES ($1, 'Kế hoạch AI', $2) RETURNING space_id", [WS.A.id, U.adminA.id])).rows[0].space_id;
  await sql("INSERT INTO lists (space_id, name, position) VALUES ($1, 'Việc tuần này', 0)", [spaceA]);
  listA2 = (await sql("INSERT INTO lists (space_id, name, position) VALUES ($1, 'Đơn hàng PO-1', 1) RETURNING list_id", [spaceA])).rows[0].list_id;
  await sql("INSERT INTO task_status (space_id, status_name, position, is_default) VALUES ($1, 'Cần làm', 0, TRUE)", [spaceA]);
  statusDone = (await sql("INSERT INTO task_status (space_id, status_name, position, is_done_state) VALUES ($1, 'Hoàn thành', 1, TRUE) RETURNING status_id", [spaceA])).rows[0].status_id;
  taskB = await makeTask(WS.B.id, U.adminB.id, 'TASK', 'Việc của công ty B');
});
after(stop);

const row = async (id) => (await sql('SELECT * FROM ai_actions WHERE action_id = $1', [id])).rows[0];
const newTask = async (name) => {
  const a = await propose(U.managerA.id, 'CREATE_TASK', { title: name, space_name: 'kế hoạch ai' });
  return (await api('POST', `/ai/actions/${a.action_id}/apply`, { as: U.managerA })).body.data.result.task_id;
};

test('tạo việc vào đúng danh sách + giao người: chỉ ghi khi bấm Áp dụng, người được giao có thông báo', async () => {
  const a = await propose(U.managerA.id, 'CREATE_TASK', { title: 'Chốt vật tư', space_name: 'Kế hoạch AI', list_name: 'po-1', assignee_names: ['member a'], due_date: '2026-11-20', priority: 'High' });
  assert.equal(a.status, 'PENDING');
  assert.deepEqual(a.summary.rows[1], ['Nơi', 'Kế hoạch AI › Đơn hàng PO-1']);
  assert.equal((await sql("SELECT 1 FROM tasks WHERE name = 'Chốt vật tư'")).rows.length, 0, 'chưa áp dụng thì chưa có việc');

  const res = await api('POST', `/ai/actions/${a.action_id}/apply`, { as: U.managerA });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.status, 'APPLIED');
  const t = (await sql('SELECT * FROM tasks WHERE task_id = $1', [res.body.data.result.task_id])).rows[0];
  assert.equal(t.list_id, listA2);
  assert.equal(t.priority, 'High');
  assert.equal(new Date(t.due_date).toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 16), '2026-11-20 17:00');
  assert.equal((await sql('SELECT 1 FROM task_assigns WHERE task_id = $1 AND user_id = $2 AND deleted_at IS NULL', [t.task_id, U.memberA.id])).rows.length, 1);
  assert.equal((await sql('SELECT 1 FROM notifications WHERE user_id = $1 AND entity_id = $2', [U.memberA.id, t.task_id])).rows.length, 1);

  const again = await api('POST', `/ai/actions/${a.action_id}/apply`, { as: U.managerA });
  assert.equal(again.status, 409, 'bấm Áp dụng lần hai không tạo thêm việc');
  const list = await api('GET', '/ai/actions', { as: U.managerA });
  assert.ok(list.body.data.some((x) => x.action_id === a.action_id && x.status === 'APPLIED'));
});

test('người khác không áp dụng / xem được đề xuất của mình', async () => {
  const a = await propose(U.managerA.id, 'CREATE_TASK', { title: 'Riêng tư', space_name: 'Kế hoạch AI' });
  assert.equal((await api('POST', `/ai/actions/${a.action_id}/apply`, { as: U.memberA })).status, 404);
  assert.ok(!(await api('GET', '/ai/actions', { as: U.memberA })).body.data.some((x) => x.action_id === a.action_id));
  assert.equal((await row(a.action_id)).status, 'PENDING');
});

test('không đề xuất được trên việc / không gian của công ty khác', async () => {
  await assert.rejects(propose(U.managerA.id, 'DELETE_TASK', { task_id: taskB }), { statusCode: 404 });
  await assert.rejects(propose(U.managerA.id, 'CREATE_TASK', { title: 'Lén', space_name: 'KG test' }), { statusCode: 400 });
});

test('xoá là xoá mềm; member không có quyền xoá', async () => {
  const id = await newTask('Việc sẽ xoá');
  await assert.rejects(propose(U.memberA.id, 'DELETE_TASK', { task_id: id }), { statusCode: 403 });
  const a = await propose(U.managerA.id, 'DELETE_TASK', { task_id: id });
  assert.equal((await api('POST', `/ai/actions/${a.action_id}/apply`, { as: U.managerA })).status, 200);
  const t = (await sql('SELECT deleted_at FROM tasks WHERE task_id = $1', [id])).rows[0];
  assert.ok(t && t.deleted_at, 'dòng vẫn còn trong DB, chỉ có deleted_at');
});

test('quyền được kiểm lại lúc áp dụng: bị hạ quyền sau khi đề xuất thì không xoá được', async () => {
  const id = await newTask('Việc giữ lại');
  const a = await propose(U.managerA.id, 'DELETE_TASK', { task_id: id });
  await sql("UPDATE workspace_members SET role_id = (SELECT role_id FROM roles WHERE role_name = 'member') WHERE workspace_id = $1 AND user_id = $2", [WS.A.id, U.managerA.id]);
  try {
    const res = await api('POST', `/ai/actions/${a.action_id}/apply`, { as: U.managerA });
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal((await row(a.action_id)).status, 'FAILED');
    assert.equal((await sql('SELECT deleted_at FROM tasks WHERE task_id = $1', [id])).rows[0].deleted_at, null);
  } finally {
    await sql("UPDATE workspace_members SET role_id = (SELECT role_id FROM roles WHERE role_name = 'manager') WHERE workspace_id = $1 AND user_id = $2", [WS.A.id, U.managerA.id]);
  }
});

test('sửa trạng thái + giao thêm người; huỷ thì không áp dụng được nữa', async () => {
  const id = await newTask('Việc cần sửa');
  const up = await propose(U.memberA.id, 'UPDATE_TASK', { task_id: id, status_name: 'hoàn thành', priority: 'Low' });
  assert.equal((await api('POST', `/ai/actions/${up.action_id}/apply`, { as: U.memberA })).status, 200);
  const t = (await sql('SELECT status_id, priority FROM tasks WHERE task_id = $1', [id])).rows[0];
  assert.deepEqual([t.status_id, t.priority], [statusDone, 'Low']);

  const as = await propose(U.managerA.id, 'ASSIGN_TASK', { task_id: id, add_names: ['Admin A'] });
  assert.equal((await api('POST', `/ai/actions/${as.action_id}/cancel`, { as: U.managerA })).body.data.status, 'CANCELLED');
  assert.equal((await api('POST', `/ai/actions/${as.action_id}/apply`, { as: U.managerA })).status, 409);
  assert.equal((await sql('SELECT 1 FROM task_assigns WHERE task_id = $1 AND user_id = $2', [id, U.adminA.id])).rows.length, 0);
});

test('tên người khớp nhiều kết quả thì hỏi lại, không đoán', async () => {
  await assert.rejects(propose(U.managerA.id, 'CREATE_TASK', { title: 'X', space_name: 'Kế hoạch AI', assignee_names: ['a'] }), /khớp nhiều/);
});

// AI giả: mỗi bước là một hàm nhận request (đọc được kết quả công cụ trước đó) và trả message của model
const fakeAI = (...steps) => {
  const seen = [];
  return { seen, chat: { completions: { create: async (req) => (seen.push(structuredClone(req)), { choices: [{ message: steps.shift()(req) }] }) } } };
};
const toolCall = (name, args) => ({ role: 'assistant', content: '', tool_calls: [{ id: `c_${name}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] });
const lastTool = (req) => JSON.parse(req.messages.at(-1).content);

test('Work: AI tìm việc thật rồi đề xuất xoá đúng việc đó; chưa xoá cho tới khi người dùng áp dụng', async () => {
  const id = await newTask('Việc AI tìm thấy');
  await makeTask(WS.B.id, U.adminB.id, 'TASK', 'Việc AI tìm thấy (công ty B)');
  const ai = fakeAI(
    () => toolCall('search_tasks', { query: 'AI tìm thấy', space_name: null }),
    (req) => {
      const found = lastTool(req);
      assert.deepEqual(found.map((t) => t.task_id), [id], 'chỉ thấy việc của công ty mình');
      return toolCall('propose_delete_task', { task_id: found[0].task_id });
    }
  );
  const out = await runWork(ai, { user_id: U.managerA.id, name: 'Manager A' }, 'Xoá việc AI tìm thấy', []);
  assert.equal(out.action.action_type, 'DELETE_TASK');
  assert.equal(out.action.status, 'PENDING');
  assert.match(ai.seen[0].messages[0].content, /Kế hoạch AI/, 'AI biết các không gian của người hỏi');
  assert.equal((await sql('SELECT deleted_at FROM tasks WHERE task_id = $1', [id])).rows[0].deleted_at, null);
});

test('Work: thiếu quyền thì AI nhận lỗi và giải thích, không có đề xuất nào được lưu', async () => {
  const id = await newTask('Việc member muốn xoá');
  const before = (await sql('SELECT COUNT(*)::int n FROM ai_actions')).rows[0].n;
  const ai = fakeAI(
    () => toolCall('propose_delete_task', { task_id: id }),
    (req) => ({ role: 'assistant', content: `Không xoá được: ${lastTool(req).error}` })
  );
  const out = await runWork(ai, { user_id: U.memberA.id, name: 'Member A' }, 'xoá giúp tôi', []);
  assert.equal(out.action, null);
  assert.match(out.response, /không có quyền xoá/);
  assert.equal((await sql('SELECT COUNT(*)::int n FROM ai_actions')).rows[0].n, before);
});

test('tên khớp theo từ trọn vẹn: "an" không khớp "Manager A" (lỗi cũ: "Hà" khớp cả "Thành", "Phạm")', async () => {
  await assert.rejects(propose(U.managerA.id, 'CREATE_TASK', { title: 'X', space_name: 'Kế hoạch AI', assignee_names: ['an'] }), /Không tìm thấy thành viên/);
  const ok = await propose(U.managerA.id, 'CREATE_TASK', { title: 'X', space_name: 'kế hoạch', assignee_names: ['manager'] });
  assert.deepEqual(ok.summary.rows[2], ['Người làm', 'Manager A']);
});
