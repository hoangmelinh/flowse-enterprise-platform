import pkg from 'pg';
const { Client } = pkg;

async function seed() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'flowse_enterprise'
  });
  await client.connect();

  console.log("Seeding demo enterprise data...");

  // 1. Workspace
  let ws = await client.query("SELECT workspace_id FROM workspaces WHERE slug = 'flowse-factory-01'");
  let workspaceId;
  if (ws.rows.length === 0) {
    const wsRes = await client.query(`
      INSERT INTO workspaces (name, description, slug, created_by)
      VALUES ('Nhà máy Chế tạo Thông minh Flowse 01', 'Tổ hợp sản xuất thông minh & dây chuyền lắp ráp tự động', 'flowse-factory-01', 1)
      RETURNING workspace_id
    `);
    workspaceId = wsRes.rows[0].workspace_id;
    console.log("Created Workspace ID:", workspaceId);

    // Link user 1 as admin
    await client.query(`
      INSERT INTO workspace_members (workspace_id, user_id, role_id)
      VALUES ($1, 1, 1)
      ON CONFLICT DO NOTHING
    `, [workspaceId]);
  } else {
    workspaceId = ws.rows[0].workspace_id;
  }

  // 2. Spaces, Lists
  let spaceRes = await client.query("SELECT space_id FROM spaces WHERE workspace_id = $1 LIMIT 1", [workspaceId]);
  let spaceId;
  if (spaceRes.rows.length === 0) {
    const sp = await client.query(`
      INSERT INTO spaces (workspace_id, name, description, is_private, created_by)
      VALUES ($1, 'Bảo trì Định kỳ Q1/2026', 'Theo dõi kế hoạch bảo dưỡng máy móc và kiểm chuẩn', FALSE, 1)
      RETURNING space_id
    `, [workspaceId]);
    spaceId = sp.rows[0].space_id;

    await client.query(`
      INSERT INTO space_members (space_id, user_id, role_id)
      VALUES ($1, 1, 1)
      ON CONFLICT DO NOTHING
    `, [spaceId]);
  } else {
    spaceId = spaceRes.rows[0].space_id;
  }

  let listRes = await client.query("SELECT list_id FROM lists WHERE space_id = $1 LIMIT 1", [spaceId]);
  let listId;
  if (listRes.rows.length === 0) {
    const lr = await client.query(`
      INSERT INTO lists (space_id, name, created_by)
      VALUES ($1, 'Công việc Cần xử lý', 1)
      RETURNING list_id
    `, [spaceId]);
    listId = lr.rows[0].list_id;
  } else {
    listId = listRes.rows[0].list_id;
  }

  // 3. Departments
  const deptCheck = await client.query("SELECT department_id FROM departments WHERE code = 'MAINT_ENG'");
  let deptId = 1;
  if (deptCheck.rows.length === 0) {
    const dRes = await client.query(`
      INSERT INTO departments (name, code, manager_id) VALUES
      ('Phòng Bảo trì & Cơ điện', 'MAINT_ENG', 1),
      ('Phân xưởng Gia công CNC', 'WORKSHOP_CNC', 1),
      ('Phòng Quản lý Chất lượng QA/QC', 'QA_QC', 1)
      RETURNING department_id;
    `);
    deptId = dRes.rows[0].department_id;
  } else {
    deptId = deptCheck.rows[0].department_id;
  }

  // 4. Assets
  let assetCheck = await client.query("SELECT asset_id FROM assets WHERE asset_code = 'CNC-VF4-01'");
  let assetId1;
  if (assetCheck.rows.length === 0) {
    const a1 = await client.query(`
      INSERT INTO assets (asset_code, name, location, department_id, qr_token, status, specs)
      VALUES 
      ('CNC-VF4-01', 'Máy Phay CNC 5 Trục Haas VF-4SS', 'Khu B - Dây chuyền 01', $1, 'QR-ASSET-CNC-VF4-01-A9F2', 'MAINTENANCE', '{"speed": "12000 RPM", "power": "30HP"}'::jsonb),
      ('ROBOT-ABB-02', 'Cánh tay Robot Hàn Tự động ABB IRB 2600', 'Khu C - Trạm Robot 02', $1, 'QR-ASSET-ROBOT-ABB-02-C7E1', 'OPERATIONAL', '{"payload": "20kg", "reach": "1.65m"}'::jsonb),
      ('COMP-AC-75', 'Hệ thống Nén khí Trung tâm Atlas Copco GA75', 'Nhà điều hành Năng lượng', $1, 'QR-ASSET-COMP-AC-75-D4B8', 'OPERATIONAL', '{"pressure": "8.5 bar"}'::jsonb)
      RETURNING asset_id
    `, [deptId]);
    assetId1 = a1.rows[0].asset_id;
    console.log("Assets seeded.");
  } else {
    assetId1 = assetCheck.rows[0].asset_id;
  }

  // 5. Workflows
  const incidentWf = await client.query("SELECT workflow_id FROM workflow_definitions WHERE code = 'INCIDENT_FLOW'");
  const wfId = incidentWf.rows[0]?.workflow_id || 2;
  const inProgState = await client.query("SELECT state_id FROM workflow_states WHERE workflow_id = $1 AND code = 'IN_PROGRESS' LIMIT 1", [wfId]);
  const stateId = inProgState.rows[0]?.state_id;

  // 6. Tasks & Incidents
  const incCheck = await client.query("SELECT COUNT(*) FROM incidents");
  if (parseInt(incCheck.rows[0].count, 10) === 0) {
    const taskRes = await client.query(`
      INSERT INTO tasks (name, description, list_id, created_by, priority, work_item_type, workflow_id, current_state_id)
      VALUES 
      ('Cảnh báo nhiệt độ trục chính vượt ngưỡng 85°C (CNC VF4-01)', 'Trục chính máy phát sinh tiếng rung và nhiệt độ tăng nhanh sau 4 giờ gia công phôi thép.', $1, 1, 'Urgent', 'INCIDENT', $2, $3)
      RETURNING task_id
    `, [listId, wfId, stateId]);

    const taskId = taskRes.rows[0].task_id;

    await client.query(`
      INSERT INTO incidents (task_id, asset_id, reported_by, severity, symptom, evidence_urls)
      VALUES ($1, $2, 1, 'CRITICAL', 'Nhiệt độ trục chính 85°C, rung giật khi quay trên 8000 RPM', ARRAY['/uploads/evidence-cnc-01.jpg'])
    `, [taskId, assetId1]);

    // Insert Approval for this task
    await client.query(`
      INSERT INTO approvals (task_id, approver_id, step_order, status, decision_note)
      VALUES ($1, 1, 1, 'PENDING', 'Đề xuất thay thế vòng bi trục chính ceramic máy CNC VF4-01')
    `, [taskId]);

    console.log("Incidents & Approvals seeded.");
  }

  await client.end();
  console.log("All demo data seeded successfully!");
}

seed().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
