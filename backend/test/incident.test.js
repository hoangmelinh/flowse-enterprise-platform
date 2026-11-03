// Việc 4: sự cố chỉ xem/sửa trong công ty mình; xoá cần quản lý; bỏ clean-test-data; /uploads cần đăng nhập.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, base, tokenOf, makeIncident } from './helpers.js';
import { U, WS } from './fixtures.js';

let incA, incB;
before(async () => {
  await start();
  incA = await makeIncident(WS.A.id, U.memberA.id);
  incB = await makeIncident(WS.B.id, U.adminB.id);
});
after(stop);

test('không xem được sự cố của công ty khác', async () => {
  assert.equal((await api('GET', `/incidents/${incB}`, { as: U.memberA })).status, 403);
  assert.equal((await api('GET', `/incidents/${incB}`, { as: U.adminB })).status, 200);
});

test('danh sách sự cố chỉ có sự cố của công ty mình', async () => {
  const res = await api('GET', '/incidents', { as: U.adminA });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const ids = res.body.data.map((i) => i.incident_id);
  assert.ok(ids.includes(incA) && !ids.includes(incB), ids.join(','));
});

test('không mở lại hay thêm ảnh cho sự cố công ty khác', async () => {
  assert.equal((await api('POST', `/incidents/${incB}/reopen`, { as: U.managerA, body: { reason: 'x' } })).status, 403);
  assert.equal((await api('POST', `/incidents/${incB}/evidence`, { as: U.managerA, body: { evidenceUrls: ['/uploads/a.webp'] } })).status, 403);
});

test('member không xoá được sự cố; manager cùng công ty xoá được', async () => {
  assert.equal((await api('DELETE', `/incidents/${incA}`, { as: U.memberA })).status, 403);
  assert.equal((await api('DELETE', `/incidents/${incA}`, { as: U.managerB })).status, 403);
  assert.equal((await api('DELETE', `/incidents/${incA}`, { as: U.managerA })).status, 200);
});

test('route clean-test-data không còn', async () => {
  assert.equal((await api('POST', '/incidents/clean-test-data', { as: U.adminA })).status, 404);
});

test('/uploads cần đăng nhập', async () => {
  const root = base.replace('/api/v1', '');
  assert.equal((await fetch(`${root}/uploads/khong-co.webp`)).status, 401);
  assert.equal((await fetch(`${root}/uploads/khong-co.webp`, { headers: { Authorization: `Bearer ${tokenOf(U.memberA)}` } })).status, 404);
  assert.equal((await fetch(`${root}/uploads/khong-co.webp?token=${tokenOf(U.memberA)}`)).status, 404);
});
