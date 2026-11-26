import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadModule } from '../../../test/loadModule.cjs';

const calls: any[] = [];
const replies: Record<string, any> = {
  'GET /assets/resolve': { success: true, data: { asset: { asset_id: 7, asset_code: 'BT-07', name: 'Băng tải' }, active_incidents: [] } },
  'GET /assets/7/health-record': {
    success: true,
    data: {
      asset: { asset_id: 7, asset_code: 'BT-07' },
      timeline: [
        { type: 'INCIDENT', id: 4, title: 'Rung', subtitle: 'Rít khi tải', root_cause: 'Vòng bi mòn', resolution: 'Thay vòng bi', fixer: 'Lê Đức Thành', status: 'RESOLVED', occurred_at: '2026-10-01T02:00:00Z' },
        { type: 'INCIDENT', id: 9, title: 'Kêu', status: 'OPEN' },
        { type: 'INSPECTION', id: 3, title: 'Kiểm tra' },
      ],
    },
  },
  'POST /assets/7/ai-insight': { success: true, data: { summary: 'Hay mòn vòng bi', likely_causes: [{ cause: 'Vòng bi mòn', incident_ids: [4] }], steps: ['Ngắt điện'], insufficient_data: false, safety_note: 'LOTO' } },
};
const reply = (method: string) => async (url: string, a?: any, b?: any) => {
  calls.push([method, url, method === 'GET' ? a : b ?? a]);
  return { data: replies[`${method} ${url}`] };
};
const { AssetRepositoryImpl } = loadModule(fileURLToPath(new URL('./AssetRepositoryImpl.ts', import.meta.url)), {
  '../api/apiClient': { __esModule: true, default: { get: reply('GET'), post: reply('POST') } },
});

test('quét QR → lịch sử sửa → Flowse AI: đọc đúng dạng { success, data } của backend', async () => {
  const repo = new AssetRepositoryImpl();
  const ctx = await repo.resolve({ code: 'BT-07' });
  assert.equal(ctx.asset.id, 7);
  assert.deepEqual(calls[0], ['GET', '/assets/resolve', { params: { code: 'BT-07' } }]);

  const record = await repo.getRecord(7);
  assert.deepEqual(record.repairs.map((r: any) => [r.id, r.open, r.rootCause, r.fixer]), [[4, false, 'Vòng bi mòn', 'Lê Đức Thành'], [9, true, undefined, undefined]]);

  const insight = await repo.explain(7, 'rung');
  assert.deepEqual(insight.likelyCauses, [{ cause: 'Vòng bi mòn', incidentIds: [4] }]);
  assert.equal(insight.safetyNote, 'LOTO');
  assert.equal(insight.insufficientData, false);
});
