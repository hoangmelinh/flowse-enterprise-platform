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
