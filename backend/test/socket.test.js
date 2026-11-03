// Việc 3: socket chỉ cho vào phòng của chính mình; không phát sự kiện ra ngoài workspace.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, sql } from './helpers.js';
import { U, WS } from './fixtures.js';

let socketService;
let convA;
before(async () => {
  await start();
  socketService = (await import('../src/services/socketService.js')).default;
  convA = (await sql("INSERT INTO conversations (type, name, workspace_id, created_by) VALUES ('CHANNEL', 'kênh A', $1, $2) RETURNING conversation_id", [WS.A.id, U.managerA.id])).rows[0].conversation_id;
  await sql('INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)', [convA, U.managerA.id]);
});
after(stop);

test('không vào được phòng cá nhân, workspace hay hội thoại của người khác', async () => {
  assert.equal(await socketService.canJoin(U.managerA.id, `user_${U.managerB.id}`), false);
  assert.equal(await socketService.canJoin(U.managerA.id, `workspace_${WS.B.id}`), false);
  assert.equal(await socketService.canJoin(U.managerB.id, `conversation_${convA}`), false);
  assert.equal(await socketService.canJoin(U.managerA.id, 'bat_ky'), false);
});

test('vào được phòng của chính mình', async () => {
  assert.equal(await socketService.canJoin(U.managerA.id, `user_${U.managerA.id}`), true);
  assert.equal(await socketService.canJoin(U.managerA.id, `workspace_${WS.A.id}`), true);
  assert.equal(await socketService.canJoin(U.managerA.id, `conversation_${convA}`), true);
});

test('không có workspace thì không phát cho ai', () => {
  const sent = [];
  const fake = { to: (room) => ({ emit: (e) => sent.push([room, e]) }), emit: (e) => sent.push(['*', e]) };
  const real = socketService.io;
  socketService.io = fake;
  try {
    socketService.emitToWorkspace(null, 'X', {});
    socketService.emitToWorkspace(WS.A.id, 'Y', {});
    socketService.emitNotificationPush(U.managerA.id, {});
  } finally {
    socketService.io = real;
  }
  assert.ok(!sent.some(([room]) => room === '*'), JSON.stringify(sent));
  assert.deepEqual(sent.find(([, e]) => e === 'Y'), [`workspace_${WS.A.id}`, 'Y']);
});
