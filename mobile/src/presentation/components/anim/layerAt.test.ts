// Chạy: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layerAt } from './layerAt.ts';
import type { Kf } from './figmaScenes.ts';

const kf: Kf[] = [[0, 0, 10, 10, 0, 0], [50, 20, 20, 10, 0, 1]];
const ref = kf[1];
const val = (r: ReturnType<typeof layerAt>, k: string) => (r.transform.find((o) => k in o) as Record<string, number | string>)[k];

test('khung cuối: lớp đứng đúng chỗ đã vẽ (transform triệt tiêu)', () => {
  const r = layerAt(kf, ref, [0, 400], 400);
  assert.equal(r.opacity, 1);
  assert.equal(val(r, 'translateX'), 50);
  assert.equal(val(r, 'scaleX'), 1);
});

test('khung đầu: độ mờ và tỉ lệ theo khung a', () => {
  const r = layerAt(kf, ref, [0, 400], 0);
  assert.equal(r.opacity, 0);
  assert.equal(val(r, 'scaleX'), 0.5);
});

test('quá thời gian cuối vẫn giữ khung cuối', () => {
  assert.equal(layerAt(kf, ref, [0, 400], 999).opacity, 1);
});
