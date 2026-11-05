// Mở app trên cổng ngẫu nhiên, nối DB vào schema test. Gọi start() trong before(), stop() trong after().
import jwt from 'jsonwebtoken';
import { SCHEMA } from './fixtures.js';

process.env.NODE_ENV = 'test';
process.env.DB_SCHEMA = SCHEMA;

let srv;
let con;
export let base = '';

export async function start() {
  // import động: biến môi trường ở trên phải có trước khi connect.js chạy
  const [{ app }, db] = await Promise.all([import('../src/server.js'), import('../src/config/connect.js')]);
  con = db.default;
  await new Promise((r) => (srv = app.listen(0, '127.0.0.1', r)));
  base = `http://127.0.0.1:${srv.address().port}/api/v1`;
}

export async function stop() {
  await new Promise((r) => srv.close(r));
  await con.end();
}

/** Token đăng nhập của một user test (bỏ qua bước signin để không vướng giới hạn đăng nhập). */
export const tokenOf = (u) => jwt.sign({ user_id: u.id, email: u.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

/** Gọi API với token của user `as` (hoặc `token` có sẵn); trả { status, body }. */
export async function api(method, path, { as, token = as && tokenOf(as), body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

/** Chạy SQL thẳng trên schema test (dựng dữ liệu cho từng ca). */
export const sql = (text, params) => con.query(text, params);

/** Tạo một việc trong workspace `wsId` (kèm không gian và danh sách riêng); trả task_id. */
export async function makeTask(wsId, ownerId, type = 'TASK', name = 'Việc test') {
  const space = (await sql('INSERT INTO spaces (workspace_id, name, created_by) VALUES ($1, $2, $3) RETURNING space_id', [wsId, 'KG test', ownerId])).rows[0].space_id;
  const list = (await sql('INSERT INTO lists (space_id, name, created_by) VALUES ($1, $2, $3) RETURNING list_id', [space, 'DS test', ownerId])).rows[0].list_id;
  return (await sql('INSERT INTO tasks (list_id, name, created_by, work_item_type) VALUES ($1, $2, $3, $4) RETURNING task_id', [list, name, ownerId, type])).rows[0].task_id;
}

/** Tạo sự cố gắn với một việc mới trong workspace `wsId`; trả incident_id. */
export async function makeIncident(wsId, reporterId) {
  const task = await makeTask(wsId, reporterId, 'INCIDENT', 'Sự cố test');
  return (await sql('INSERT INTO incidents (task_id, reported_by, symptom) VALUES ($1, $2, $3) RETURNING incident_id', [task, reporterId, 'Rung'])).rows[0].incident_id;
}
