// Chạy: npm test (node --test, không cần thư viện test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueBucket } from './dueDate.ts';

const now = new Date(2026, 9, 30, 10, 0); // 30/10/2026 10:00 giờ máy

test('xếp hạn theo ngày trên máy', () => {
  assert.equal(dueBucket(undefined, now), 'none');
  assert.equal(dueBucket('không phải ngày', now), 'none');
  assert.equal(dueBucket(new Date(2026, 9, 29, 23, 59).toISOString(), now), 'overdue');
  assert.equal(dueBucket(new Date(2026, 9, 30, 0, 0).toISOString(), now), 'today');
  assert.equal(dueBucket(new Date(2026, 9, 30, 8, 0).toISOString(), now), 'today'); // đã qua giờ nhưng vẫn là hôm nay
  assert.equal(dueBucket(new Date(2026, 9, 31, 0, 0).toISOString(), now), 'later');
});
