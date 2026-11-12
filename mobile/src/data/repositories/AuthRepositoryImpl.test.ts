import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadModule } from '../../../test/loadModule.cjs';

let lastGet: any[] = [];
const api = {
  current_workspace_id: 2,
  workspaces: [{ workspace_id: 1, name: 'A', role_name: 'manager' }, { workspace_id: 2, name: 'B', role_name: 'member' }],
  capabilities: { can_execute_repair: true, can_approve: false, can_scan_qr: 'yes' },
};
const { AuthRepositoryImpl } = loadModule(fileURLToPath(new URL('./AuthRepositoryImpl.ts', import.meta.url)), {
  '../api/apiClient': { __esModule: true, default: { get: async (...args: any[]) => { lastGet = args; return { data: { data: api } }; } } },
  '../local/secureStorage': { __esModule: true, default: {} },
});

test('getContexts: nơi hiện tại và quyền lấy đúng từ /users/contexts', async () => {
  const ctx = await new AuthRepositoryImpl().getContexts(2);
  assert.deepEqual(lastGet, ['/users/contexts', { params: { workspaceId: 2 } }]);
  assert.equal(ctx.currentWorkspace.name, 'B');
  assert.equal(ctx.currentWorkspace.role, 'member');
  assert.equal(ctx.capabilities.canExecuteRepair, true);
  assert.equal(ctx.capabilities.canApprove, false);
  // Chỉ true thật mới là có quyền; thiếu hoặc sai kiểu là không
  assert.equal(ctx.capabilities.canScanQR, false);
  assert.equal(ctx.capabilities.canAssignWork, false);
});
