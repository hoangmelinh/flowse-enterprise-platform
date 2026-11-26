// Phase 3A: Kiểm chứng cô lập đa Workspace (P0-1..P0-7), schema contract, KPI 3 Scope & AI factual fallback.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, stop, api, sql, makeTask, makeIncident } from './helpers.js';
import { U, WS } from './fixtures.js';

let deptA, deptOfficeA, deptB;
let assetA, assetB;
let taskA, taskB, reqA;
let incA, incB;
let runB;

before(async () => {
  await start();

  deptA = (
    await sql(
      "INSERT INTO departments (name, code, manager_id, workspace_id) VALUES ('Tổ Cơ Điện A', 'MAINT_A', $1, $2) RETURNING department_id",
      [U.managerA.id, WS.A.id]
    )
  ).rows[0].department_id;

  deptOfficeA = (
    await sql(
      "INSERT INTO departments (name, code, workspace_id) VALUES ('Phòng Kế Hoạch A', 'PLAN_A', $1) RETURNING department_id",
      [WS.A.id]
    )
  ).rows[0].department_id;

  deptB = (
    await sql(
      "INSERT INTO departments (name, code, manager_id, workspace_id) VALUES ('Xưởng B', 'PROD_B', $1, $2) RETURNING department_id",
      [U.managerB.id, WS.B.id]
    )
  ).rows[0].department_id;

  assetA = (
    await sql(
      "INSERT INTO assets (asset_code, name, qr_token, department_id, workspace_id, status) VALUES ('A-MD01', 'Máy dán A', 'tok-iso-a1', $1, $2, 'OPERATIONAL') RETURNING asset_id",
      [deptA, WS.A.id]
    )
  ).rows[0].asset_id;

  assetB = (
    await sql(
      "INSERT INTO assets (asset_code, name, qr_token, department_id, workspace_id, status) VALUES ('B-CNC99', 'Máy B', 'tok-iso-b99', $1, $2, 'FAULTY') RETURNING asset_id",
      [deptB, WS.B.id]
    )
  ).rows[0].asset_id;

  taskA = await makeTask(WS.A.id, U.memberA.id, 'TASK', 'Kế hoạch văn phòng A');
  await sql('UPDATE tasks SET department_id = $1 WHERE task_id = $2', [deptOfficeA, taskA]);

  reqA = await makeTask(WS.A.id, U.memberA.id, 'REQUEST', 'Đề xuất VPP A');
  await sql('UPDATE tasks SET department_id = $1 WHERE task_id = $2', [deptOfficeA, reqA]);

  taskB = await makeTask(WS.B.id, U.adminB.id, 'TASK', 'Bí mật B');
  await sql('UPDATE tasks SET department_id = $1 WHERE task_id = $2', [deptB, taskB]);

  incA = await makeIncident(WS.A.id, U.memberA.id);
  await sql('UPDATE incidents SET asset_id = $1, resolved_at = CURRENT_TIMESTAMP, downtime_minutes = 45 WHERE incident_id = $2', [assetA, incA]);

  incB = await makeIncident(WS.B.id, U.adminB.id);
  await sql('UPDATE incidents SET asset_id = $1, resolved_at = CURRENT_TIMESTAMP, downtime_minutes = 600 WHERE incident_id = $2', [assetB, incB]);

  const clB = (
    await sql("INSERT INTO checklists (asset_id, title, is_active) VALUES ($1, 'Checklist B', true) RETURNING checklist_id", [assetB])
  ).rows[0].checklist_id;
  runB = (
    await sql("INSERT INTO inspection_runs (checklist_id, inspector_id, overall_status, completed_at) VALUES ($1, $2, 'FAIL', CURRENT_TIMESTAMP) RETURNING run_id", [clB, U.adminB.id])
  ).rows[0].run_id;
});

after(stop);

test('P0: Workspace A không đọc được Departments, Assets, HealthRecord, WorkItem hay AI Summary của Workspace B', async () => {
  assert.equal((await api('GET', `/departments?workspaceId=${WS.B.id}`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/departments/tree?workspaceId=${WS.B.id}`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/departments/${deptB}`, { as: U.adminA })).status, 403);

  assert.equal((await api('GET', `/assets?workspaceId=${WS.B.id}`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/assets/${assetB}`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/assets/${assetB}/health-record`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/assets/resolve?token=tok-iso-b99`, { as: U.adminA })).status, 403);

  assert.equal((await api('GET', `/work-items/${taskB}`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/work-items/${taskB}`, { as: U.adminB })).status, 200);

  assert.equal((await api('POST', '/ai/summarize-incident', { as: U.adminA, body: { incident_id: incB } })).status, 403);
  assert.equal((await api('POST', '/ai/summarize-incident', { as: U.adminB, body: { incident_id: incB } })).status, 200);
});

test('P0: Inspection runs, sync logs & operations-overview cô lập Workspace và chặn Member', async () => {
  assert.equal((await api('GET', `/inspections/runs?workspaceId=${WS.B.id}`, { as: U.adminA })).status, 403);
  const runsB = await api('GET', `/inspections/runs?workspaceId=${WS.B.id}`, { as: U.adminB });
  assert.equal(runsB.status, 200);
  assert.ok(runsB.body.data.some((r) => r.run_id === runB));

  assert.equal((await api('GET', `/sync/logs?workspaceId=${WS.B.id}`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/workspaces/${WS.B.id}/operations-overview`, { as: U.adminA })).status, 403);
  assert.equal((await api('GET', `/workspaces/${WS.A.id}/operations-overview`, { as: U.memberA })).status, 403);
});

test('P0+P1: Downtime stats & AI Analytics Summary chỉ tính dữ liệu Workspace của mình và không bịa CNC', async () => {
  const statsA = await api('GET', `/incidents/stats/downtime-mttr?period=all&workspaceId=${WS.A.id}`, { as: U.adminA });
  assert.equal(statsA.status, 200);
  assert.equal(statsA.body.data.totalDowntimeMinutes, 45);
  assert.ok(!statsA.body.data.topDowntimeAssets.some((a) => a.asset_id === assetB));

  const aiA = await api('POST', '/ai/analytics-summary', { as: U.adminA, body: { period: 'all', workspaceId: WS.A.id } });
  assert.equal(aiA.status, 200);
  assert.equal(aiA.body.data.analysisSource, 'factual_fallback');
  assert.deepEqual(aiA.body.data.possibleCauses, []);
  assert.ok(!JSON.stringify(aiA.body.data).includes('CNC-024'));
  assert.ok(!JSON.stringify(aiA.body.data).includes('kẹt phoi'));

  // Cố tình hỏi workspace B từ tài khoản A -> 403
  assert.equal((await api('POST', '/ai/analytics-summary', { as: U.adminA, body: { period: 'all', workspaceId: WS.B.id } })).status, 403);
});

test('P1: Operations Overview phân tách đúng 3 Scope (all/office/industrial) & không trộn MTTR vào Office', async () => {
  const officeRes = await api('GET', `/workspaces/${WS.A.id}/operations-overview?scope=office&period=all`, { as: U.adminA });
  assert.equal(officeRes.status, 200, JSON.stringify(officeRes.body));
  assert.equal(officeRes.body.data.industrial, null);
  assert.equal(officeRes.body.data.enterprise, null);
  assert.ok(officeRes.body.data.office.openTasks >= 1);
  assert.ok(officeRes.body.data.office.openRequests >= 1);

  const indRes = await api('GET', `/workspaces/${WS.A.id}/operations-overview?scope=industrial&period=all`, { as: U.adminA });
  assert.equal(indRes.status, 200);
  assert.equal(indRes.body.data.office, null);
  assert.equal(indRes.body.data.industrial.assetsByStatus.OPERATIONAL, 1);
  assert.equal(indRes.body.data.industrial.downtime.totalElapsedMinutes, 45);
  assert.equal(indRes.body.data.industrial.downtime.repairDurationAvailable, false);

  // Manager bị giới hạn phòng ban: Manager A chỉ quản lý deptA nên lọc theo deptOfficeA phải bị 403
  const mgrRes = await api('GET', `/workspaces/${WS.A.id}/operations-overview?scope=all&departmentId=${deptOfficeA}`, { as: U.managerA });
  assert.equal(mgrRes.status, 403);

  // Admin kiểm tra lọc phòng ban của Workspace khác -> 403
  const crossDept = await api('GET', `/workspaces/${WS.A.id}/operations-overview?scope=all&departmentId=${deptB}`, { as: U.adminA });
  assert.equal(crossDept.status, 403);
});

test('P1: Schema contract - Asset chỉ nhận 4 trạng thái hợp lệ và từ chối BROKEN', async () => {
  const bad = await api('POST', '/assets', {
    as: U.adminA,
    body: { asset_code: 'A-BAD', name: 'Bad', department_id: deptA, status: 'BROKEN' },
  });
  assert.equal(bad.status, 400);

  const good = await api('POST', '/assets', {
    as: U.adminA,
    body: {
      asset_code: 'A-GOOD',
      name: 'Good Asset',
      department_id: deptA,
      status: 'FAULTY',
      manufacturer: 'Bosch',
      model: 'X200',
    },
  });
  assert.equal(good.status, 201, JSON.stringify(good.body));
  assert.equal(good.body.data.status, 'FAULTY');
  assert.equal(good.body.data.specs.manufacturer, 'Bosch');
});

test('P0 Audit Fix: User thuộc cả 2 Workspace không bị rò rỉ sự cố không gắn thiết bị ở AI Analytics', async () => {
  const beforeAi = await api('POST', '/ai/analytics-summary', { as: U.adminA, body: { period: 'all', workspaceId: WS.A.id } });
  const beforeOpen = beforeAi.body.data.openIncidentsCount;
  const beforeCrit = beforeAi.body.data.criticalIncidentsCount;

  // Thêm adminA làm member tạm thời của Workspace B rồi tạo 1 sự cố CRITICAL không gắn asset ở B
  await sql(
    "INSERT INTO workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, (SELECT role_id FROM roles WHERE role_name = 'member')) ON CONFLICT DO NOTHING",
    [WS.B.id, U.adminA.id]
  );
  const incNoAssetB = await makeIncident(WS.B.id, U.adminB.id);
  await sql("UPDATE incidents SET severity = 'CRITICAL' WHERE incident_id = $1", [incNoAssetB]);

  const aiA = await api('POST', '/ai/analytics-summary', { as: U.adminA, body: { period: 'all', workspaceId: WS.A.id } });
  assert.equal(aiA.status, 200);
  // Sự cố CRITICAL mới ở WS B không được làm tăng số mở / CRITICAL của WS A
  assert.equal(aiA.body.data.openIncidentsCount, beforeOpen);
  assert.equal(aiA.body.data.criticalIncidentsCount, beforeCrit);

  await sql('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [WS.B.id, U.adminA.id]);
});

test('Phase B Authz: Template hệ thống chỉ đọc, Manager bị giới hạn phòng ban trên Audit Logs & không sửa SLA, chống gán Manager chéo Workspace', async () => {
  // 1. System checklist (asset_id IS NULL) cannot be mutated by tenant admin, and tenant admin cannot create global template without asset_id
  const sysRow = (
    await sql("INSERT INTO checklists (asset_id, title, is_active) VALUES (NULL, 'System Global Check', true) RETURNING checklist_id")
  ).rows[0].checklist_id;
  const mutSys = await api('PUT', `/inspections/templates/${sysRow}`, {
    as: U.adminA,
    headers: { 'x-workspace-id': String(WS.A.id) },
    body: { title: 'Hacked Global', is_active: false },
  });
  assert.equal(mutSys.status, 403, JSON.stringify(mutSys.body));

  const createGlobal = await api('POST', '/inspections/templates', {
    as: U.adminA,
    headers: { 'x-workspace-id': String(WS.A.id) },
    body: { title: 'Unbound Global', items: [] },
  });
  assert.equal(createGlobal.status, 400, JSON.stringify(createGlobal.body));

  // 2. Department controller blocks assigning manager from Workspace B & self-parenting cycle
  const badMgr = await api('POST', '/departments', {
    as: U.adminA,
    body: { name: 'Dept Bad Mgr', code: 'BAD_MGR', manager_id: U.managerB.id },
  });
  assert.equal(badMgr.status, 400, JSON.stringify(badMgr.body));

  const selfCycle = await api('PUT', `/departments/${deptA}`, {
    as: U.adminA,
    body: { parent_id: deptA },
  });
  assert.equal(selfCycle.status, 400, JSON.stringify(selfCycle.body));

  // 3. Manager cannot modify SLA configs (Admin-only)
  const mgrSla = await api('POST', '/workflows/sla-configs', {
    as: U.managerA,
    headers: { 'x-workspace-id': String(WS.A.id) },
    body: { severity: 'HIGH', target_response_minutes: 10, target_resolve_minutes: 60 },
  });
  assert.equal(mgrSla.status, 403, JSON.stringify(mgrSla.body));

  // 4. Manager A's activity log access is scoped to deptA (cannot see deptOfficeA task activity)
  await sql("INSERT INTO activity_logs (task_id, user_id, action) VALUES ($1, $2, 'created')", [taskA, U.memberA.id]);
  const mgrActs = await api('GET', `/activities/workspace/${WS.A.id}`, { as: U.managerA });
  assert.equal(mgrActs.status, 200);
  assert.ok(!mgrActs.body.data.some((a) => a.task_id === taskA), 'Manager A must not see activity from deptOfficeA');

  const adminActs = await api('GET', `/activities/workspace/${WS.A.id}`, { as: U.adminA });
  assert.equal(adminActs.status, 200);
  assert.ok(adminActs.body.data.some((a) => a.task_id === taskA), 'Admin A sees workspace-wide activity');

  // 5. Multi-workspace user cannot be globally locked via is_active=false by Admin A
  await sql(
    "INSERT INTO workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, (SELECT role_id FROM roles WHERE role_name = 'member')) ON CONFLICT DO NOTHING",
    [WS.B.id, U.memberA.id]
  );
  const lockMulti = await api('PATCH', `/workspaces/${WS.A.id}/members/${U.memberA.id}`, {
    as: U.adminA,
    body: { is_active: false },
  });
  assert.equal(lockMulti.status, 409, JSON.stringify(lockMulti.body));
  await sql('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [WS.B.id, U.memberA.id]);
  await sql('DELETE FROM checklists WHERE checklist_id = $1', [sysRow]);
});
