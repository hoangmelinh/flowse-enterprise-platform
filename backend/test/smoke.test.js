import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api } from './helpers.js';
import { U, PASSWORD } from './fixtures.js';

before(start);
after(stop);

test('đăng nhập bằng email + mật khẩu rồi đọc hồ sơ', async () => {
  const login = await api('POST', '/auth/signin', { body: { email: U.memberA.email, password: PASSWORD } });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const me = await api('GET', '/users/profile', { token: login.body.user.access_token });
  assert.equal(me.status, 200);
});

test('không có token thì bị chặn', async () => {
  const res = await api('GET', '/users/profile');
  assert.equal(res.status, 401);
});
