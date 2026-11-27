import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadModule } from '../../../test/loadModule.cjs';

const calls: unknown[][] = [];
let response: unknown;
let failure: unknown;
const apiClient = {
  get: async (...args: unknown[]) => { calls.push(['get', ...args]); if (failure) throw failure; return { data: response }; },
  post: async (...args: unknown[]) => { calls.push(['post', ...args]); if (failure) throw failure; return { data: response }; },
  delete: async (...args: unknown[]) => { calls.push(['delete', ...args]); if (failure) throw failure; return { data: response }; },
};
const errors = loadModule(fileURLToPath(new URL('../../core/errors/AppError.ts', import.meta.url)));
const { MessageRepositoryImpl } = loadModule(fileURLToPath(new URL('./MessageRepositoryImpl.ts', import.meta.url)), {
  '../api/apiClient': { __esModule: true, default: apiClient },
  '../../core/errors/AppError': errors,
});
const repo = new MessageRepositoryImpl();

test.beforeEach(() => { calls.length = 0; failure = undefined; });

test('map hội thoại trực tiếp theo tên người đối diện và kênh có dấu #', async () => {
  response = [
    {
      conversation_id: 10,
      workspace_id: 3,
      type: 'DIRECT',
      name: null,
      space_id: null,
      created_by: 1,
      created_at: '2026-11-26T09:00:00Z',
      members: [
        { user_id: 1, name: 'Nguyễn Minh Anh', username: 'minhanh', avatar_url: null },
        { user_id: 2, name: 'Trần Quốc Dũng', username: 'dungtq', avatar_url: null },
      ],
      last_message: { content: 'Rung giảm chưa em?', sender_id: 2, sender_name: 'Trần Quốc Dũng', created_at: '2026-11-26T10:15:00Z' },
      message_count: 4,
    },
    {
      conversation_id: 11,
      workspace_id: 3,
      type: 'CHANNEL',
      name: 'bảo-trì-a2',
      space_id: null,
      created_by: 2,
      created_at: '2026-11-26T08:00:00Z',
      members: [],
      last_message: null,
      message_count: 0,
    },
  ];
  const convs = await repo.getConversations(3, 1);
  assert.equal(convs[0].name, 'Trần Quốc Dũng');
  assert.equal(convs[0].kind, 'direct');
  assert.equal(convs[1].name, '#bảo-trì-a2');
  assert.equal(convs[1].kind, 'channel');
  assert.deepEqual(calls[0], ['get', '/messages/conversations', { params: { workspace_id: 3 } }]);
});

test('lấy và gửi tin nhắn chuẩn endpoint và map ChatMessage', async () => {
  response = [{ message_id: 88, conversation_id: 10, sender_id: 2, content: 'Chào em', created_at: '2026-11-26T10:00:00Z', sender_name: 'Trần Quốc Dũng', sender_username: 'dungtq' }];
  const msgs = await repo.getMessages(10, 30);
  assert.equal(msgs[0].id, 88);
  assert.equal(msgs[0].senderName, 'Trần Quốc Dũng');
  assert.deepEqual(calls[0], ['get', '/messages/10', { params: { limit: 30 } }]);

  response = { message_id: 89, conversation_id: 10, sender_id: 1, content: 'Đã kiểm tra xong', created_at: '2026-11-26T10:05:00Z', sender_name: 'Nguyễn Minh Anh', sender_username: 'minhanh' };
  const sent = await repo.sendMessage(10, 'Đã kiểm tra xong');
  assert.equal(sent.id, 89);
  assert.deepEqual(calls[1], ['post', '/messages/10', { content: 'Đã kiểm tra xong' }]);
});

test('tạo DM, tạo kênh bỏ dấu # thừa và dịch NetworkError sang tiếng Việt', async () => {
  response = { conversation_id: 25 };
  assert.equal(await repo.startDirectMessage(3, 4), 25);
  assert.deepEqual(calls[0], ['post', '/messages/direct', { workspace_id: 3, target_user_id: 4 }]);

  response = { conversation_id: 26, workspace_id: 3, type: 'CHANNEL', name: 'ca-chiều', space_id: null, created_by: 1, created_at: '2026-11-26T10:00:00Z' };
  const ch = await repo.createChannel(3, '#ca-chiều', [4]);
  assert.equal(ch.name, '#ca-chiều');
  assert.deepEqual(calls[1], ['post', '/messages/channels', { workspace_id: 3, name: 'ca-chiều', member_ids: [4] }]);

  failure = new errors.NetworkError('Network Error');
  await assert.rejects(() => repo.sendMessage(10, 'test'), { message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.' });
});
