// Việc 5: bước chuyển kiểm tra đúng trường bắt buộc; AI lỗi hay ảnh không có thì không tự "nghiệm thu đạt".
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, sql, makeIncident } from './helpers.js';
import { U, WS } from './fixtures.js';

let wf, state;
/** Sự cố công ty A đang ở trạng thái `code` của quy trình INCIDENT_FLOW; trả { inc, task }. */
async function incidentAt(code) {
  const inc = await makeIncident(WS.A.id, U.memberA.id);
  const task = (await sql('SELECT task_id FROM incidents WHERE incident_id = $1', [inc])).rows[0].task_id;
  await sql('UPDATE tasks SET workflow_id = $1, current_state_id = $2 WHERE task_id = $3', [wf, state[code], task]);
  return { inc, task };
}

before(async () => {
  await start();
  wf = (await sql("SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW'")).rows[0].workflow_id;
  state = Object.fromEntries((await sql('SELECT code, state_id FROM workflow_states WHERE workflow_id = $1', [wf])).rows.map((r) => [r.code, r.state_id]));
  await sql("UPDATE workflow_transitions SET required_fields = ARRAY['downtime_minutes'] WHERE workflow_id = $1 AND from_state_id = $2 AND to_state_id = $3", [wf, state.IN_PROGRESS, state.WAITING_VERIFY]);
});
after(stop);

test('thiếu trường bắt buộc: ghi chú bất kỳ không thay được', async () => {
  const { task } = await incidentAt('IN_PROGRESS');
  const res = await api('POST', `/workflows/tasks/${task}/transition`, { as: U.managerA, body: { toStateId: state.WAITING_VERIFY, note: 'đã sửa xong' } });
  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.match(JSON.stringify(res.body), /downtime_minutes/);
  assert.equal((await sql('SELECT current_state_id FROM tasks WHERE task_id = $1', [task])).rows[0].current_state_id, state.IN_PROGRESS);
  const ok = await api('POST', `/workflows/tasks/${task}/transition`, { as: U.managerA, body: { toStateId: state.WAITING_VERIFY, metadata: { downtime_minutes: 42 } } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
});

test('ảnh không có trên máy chủ và kết quả AI do client gửi: không được VERIFIED', async () => {
  const { inc, task } = await incidentAt('WAITING_VERIFY');
  const res = await api('POST', `/workflows/tasks/${task}/transition`, {
    as: U.managerA,
    body: { toStateId: state.RESOLVED, metadata: { evidence_urls: ['/uploads/khong-ton-tai.webp'], ai_evidence_status: 'VERIFIED', ai_evidence_score: 99 } },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const row = (await sql('SELECT ai_evidence_status, ai_evidence_score FROM incidents WHERE incident_id = $1', [inc])).rows[0];
  assert.equal(row.ai_evidence_status, 'WARNING');
  assert.notEqual(row.ai_evidence_score, 99);
});

test('đường dẫn ảnh không được trỏ ra ngoài thư mục uploads', async () => {
  const { default: AIVisionService } = await import('../src/services/aiVisionService.js');
  const r = await AIVisionService.analyzeEvidence({ imageUrl: '/uploads/../package.json' });
  assert.equal(r.status, 'WARNING');
});
