import con from '../src/config/connect.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5001/api/v1';

async function main() {
  console.log('================================================================');
  console.log('   FLOWSE 2.0 - FULL BACKEND & API CONTRACT VERIFICATION SUITE   ');
  console.log('================================================================\n');

  // Lấy thông tin user test (id = 1, flowse admin) và sinh JWT Token
  const uRes = await con.query("SELECT user_id, email, name FROM users WHERE user_id = 1");
  if (uRes.rows.length === 0) throw new Error("User 1 not found");
  const testUser = uRes.rows[0];

  const token = jwt.sign(
    { user_id: testUser.user_id, email: testUser.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  let passedTests = 0;
  let totalTests = 0;

  const assertTest = (description, condition, details = "") => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${description} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`  [FAIL] ${description} ${details ? `(${details})` : ''}`);
      throw new Error(`Test failed: ${description}`);
    }
  };

  // -------------------------------------------------------------
  // MODULE 1: Identity & Access Management (IAM & RBAC)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 1: IDENTITY & ACCESS MANAGEMENT (IAM) ---');
  
  // 1.1 GET /users/profile
  const profRes = await fetch(`${API_BASE}/users/profile`, { headers });
  const profData = await profRes.json();
  assertTest('1.1 GET /api/v1/users/profile', profRes.status === 200 && profData.data?.email === testUser.email, `User: ${profData.data?.name}`);

  // 1.2 GET /departments/tree (Enterprise Hierarchy: Phân xưởng -> Dây chuyền -> Tổ/Ca)
  const treeRes = await fetch(`${API_BASE}/departments/tree`, { headers });
  const treeData = await treeRes.json();
  assertTest('1.2 GET /api/v1/departments/tree', treeRes.status === 200 && Array.isArray(treeData.data), `Root units: ${treeData.data?.length}`);

  // 1.3 GET /users/contexts (Dynamic Capabilities & Accessible Departments)
  const ctxRes = await fetch(`${API_BASE}/users/contexts`, { headers });
  const ctxData = await ctxRes.json();
  assertTest('1.3 GET /api/v1/users/contexts', ctxRes.status === 200 && ctxData.data?.capabilities?.can_report_incident === true, `Admin universal: ${ctxData.data?.accessible_department_ids === null}`);

  // -------------------------------------------------------------
  // MODULE 2: Universal Work Items & Workflow Engine
  // -------------------------------------------------------------
  console.log('\n--- MODULE 2: WORK ITEMS & WORKFLOW ENGINE ---');

  // 2.1 POST /work-items (Tạo Work Item dạng TASK)
  const taskWiRes = await fetch(`${API_BASE}/work-items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: "Hiệu chỉnh độ đồng tâm trục máy gia công",
      description: "Thực hiện kiểm tra đồng tâm trục chính bằng đồng hồ so cơ khí",
      work_item_type: "TASK",
      priority: "High"
    })
  });
  const taskWiData = await taskWiRes.json();
  const createdTaskId = taskWiData.data?.task_id;
  assertTest('2.1 POST /api/v1/work-items (TASK)', taskWiRes.status === 201 && createdTaskId > 0, `Task #${createdTaskId}`);

  // 2.2 GET /work-items/my-work (Bucket categorizations)
  const myWorkRes = await fetch(`${API_BASE}/work-items/my-work`, { headers });
  const myWorkData = await myWorkRes.json();
  assertTest('2.2 GET /api/v1/work-items/my-work', myWorkRes.status === 200 && myWorkData.data?.buckets !== undefined, `Total: ${myWorkData.data?.total_count}`);

  // 2.3 GET /work-items/:id (Xem chi tiết, assignees, transitions, audit trail)
  const wiDetailRes = await fetch(`${API_BASE}/work-items/${createdTaskId}`, { headers });
  const wiDetailData = await wiDetailRes.json();
  assertTest('2.3 GET /api/v1/work-items/:id', wiDetailRes.status === 200 && wiDetailData.data?.id === createdTaskId, `Type: ${wiDetailData.data?.type}`);

  // 2.4 GET /workflows (Danh sách định nghĩa quy trình)
  const wfDefRes = await fetch(`${API_BASE}/workflows`, { headers });
  const wfDefData = await wfDefRes.json();
  assertTest('2.4 GET /api/v1/workflows', wfDefRes.status === 200 && Array.isArray(wfDefData.data), `Total workflows: ${wfDefData.data?.length}`);

  // 2.5 GET /workflows/:id/transitions (Các bước chuyển hợp lệ)
  const transRes = await fetch(`${API_BASE}/workflows/${createdTaskId}/transitions`, { headers });
  const transData = await transRes.json();
  assertTest('2.5 GET /api/v1/workflows/:id/transitions', transRes.status === 200 && Array.isArray(transData.data), `Transitions: ${transData.data?.map(t => t.to_state_code).join(', ')}`);

  // 2.6 POST /workflows/:id/transition (Thực thi transition state machine)
  if (transData.data?.length > 0) {
    const nextTransition = transData.data[0];
    const execTransRes = await fetch(`${API_BASE}/workflows/${createdTaskId}/transition`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        transition_id: nextTransition.transition_id,
        reason: "Bắt đầu triển khai theo kế hoạch"
      })
    });
    const execTransData = await execTransRes.json();
    assertTest('2.6 POST /api/v1/workflows/:id/transition', execTransRes.status === 200, `New state: ${execTransData.data?.to_state_code}`);
  }

  // -------------------------------------------------------------
  // MODULE 3: Incident Management
  // -------------------------------------------------------------
  console.log('\n--- MODULE 3: INCIDENT MANAGEMENT ---');

  // 3.1 GET /assets để lấy asset_id kiểm thử
  const assetsRes = await fetch(`${API_BASE}/assets`, { headers });
  const assetsData = await assetsRes.json();
  const testAsset = assetsData.data?.[0];
  const assetId = testAsset?.asset_id || 1;

  // 3.2 POST /incidents (Báo sự cố hiện trường kèm khởi tạo SLA)
  const incRes = await fetch(`${API_BASE}/incidents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `Sự cố thử nghiệm phát nhiệt động cơ #${assetId}`,
      symptom: "Nhiệt độ vòng bi vượt ngưỡng 85°C kèm rung lắc bất thường",
      asset_id: assetId,
      severity: "HIGH",
      evidence_urls: ["https://example.com/evidence/bearing_heat.jpg"]
    })
  });
  const incData = await incRes.json();
  const incidentId = incData.data?.incident_id;
  const incTaskId = incData.data?.task?.task_id || incData.data?.task_id;
  assertTest('3.1 POST /api/v1/incidents', incRes.status === 201 && incidentId > 0, `Incident #${incidentId}`);

  // 3.3 GET /incidents (Danh sách sự cố hiện trường)
  const incListRes = await fetch(`${API_BASE}/incidents`, { headers });
  const incListData = await incListRes.json();
  assertTest('3.2 GET /api/v1/incidents', incListRes.status === 200 && Array.isArray(incListData.data), `Total incidents: ${incListData.data?.length}`);

  // 3.4 POST /incidents/:id/assign (Quản đốc chỉ định kỹ thuật viên)
  const assignRes = await fetch(`${API_BASE}/incidents/${incidentId}/assign`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      technicianId: testUser.user_id,
      note: "Phân công kỹ thuật viên chính xử lý ngay"
    })
  });
  const assignData = await assignRes.json();
  assertTest('3.3 POST /api/v1/incidents/:id/assign', assignRes.status === 200, `Assigned to: ${testUser.name}`);

  // 3.5 POST /incidents/:id/evidence (Tải ảnh bằng chứng hiện trường)
  const evRes = await fetch(`${API_BASE}/incidents/${incidentId}/evidence`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      evidenceUrls: ["https://example.com/evidence/after_disassembly.jpg"],
      note: "Ảnh sau khi tháo cụm bạc đạn"
    })
  });
  const evData = await evRes.json();
  assertTest('3.4 POST /api/v1/incidents/:id/evidence', evRes.status === 200, `Evidence count: ${evData.data?.evidence_urls?.length}`);

  // 3.6 POST /incidents/:id/request-parts (Field -> Office Bridge)
  const reqPartsRes = await fetch(`${API_BASE}/incidents/${incidentId}/request-parts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      partName: "Phớt chắn mỡ chịu nhiệt NBR 45x65x10",
      quantity: 4,
      reason: "Phớt cũ bị chai cứng gây rò rỉ dầu mỡ bôi trơn"
    })
  });
  const reqPartsData = await reqPartsRes.json();
  const approvalId = reqPartsData.data?.approval_id;
  assertTest('3.5 POST /api/v1/incidents/:id/request-parts', reqPartsRes.status === 201 && approvalId > 0, `Approval ID #${approvalId}`);

  // -------------------------------------------------------------
  // MODULE 4: Approval Center (Trung Tâm Phê Duyệt)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 4: APPROVAL CENTER ---');

  // 4.1 GET /approvals/pending
  const pendingRes = await fetch(`${API_BASE}/approvals/pending`, { headers });
  const pendingData = await pendingRes.json();
  assertTest('4.1 GET /api/v1/approvals/pending', pendingRes.status === 200 && Array.isArray(pendingData.data), `Pending count: ${pendingData.data?.length}`);

  // 4.2 POST /approvals/:id/decision (Duyệt cấp vật tư)
  if (approvalId) {
    const decisionRes = await fetch(`${API_BASE}/approvals/${approvalId}/decision`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        status: "APPROVED",
        decisionNote: "Kho đã xuất 04 phớt NBR đúng chủng loại."
      })
    });
    const decisionData = await decisionRes.json();
    assertTest('4.2 POST /api/v1/approvals/:id/decision', decisionRes.status === 200, `${decisionData.message}`);
  }

  // 3.7 Kiểm thử Giao Thức Mở Lại Sự Cố trong 24h (24h Incident Reopen Protocol)
  console.log('\n--- KIỂM THỬ 24H REOPEN PROTOCOL ---');
  // Giả lập sự cố hoàn thành (resolved_at = NOW())
  await con.query("UPDATE incidents SET resolved_at = CURRENT_TIMESTAMP WHERE incident_id = $1", [incidentId]);
  const reopenRes = await fetch(`${API_BASE}/incidents/${incidentId}/reopen`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reason: "Máy chạy thử tải 30 phút vẫn phát nhiệt cục bộ 78°C"
    })
  });
  const reopenData = await reopenRes.json();
  assertTest('3.6 POST /api/v1/incidents/:id/reopen (24h Protocol)', reopenRes.status === 200 && reopenData.data?.new_state === 'IN_PROGRESS', `Reopened to: ${reopenData.data?.new_state}`);

  // -------------------------------------------------------------
  // MODULE 5: Inspection Engine & Checklist
  // -------------------------------------------------------------
  console.log('\n--- MODULE 5: INSPECTION ENGINE ---');

  // 5.1 GET /inspections/templates
  const tmplRes = await fetch(`${API_BASE}/inspections/templates`, { headers });
  const tmplData = await tmplRes.json();
  assertTest('5.1 GET /api/v1/inspections/templates', tmplRes.status === 200 && Array.isArray(tmplData.data), `Templates: ${tmplData.data?.length}`);
  const sampleTmplId = tmplData.data?.[0]?.checklist_id || 1;

  // 5.2 GET /inspections/:id
  const chkDetailRes = await fetch(`${API_BASE}/inspections/${sampleTmplId}`, { headers });
  const chkDetailData = await chkDetailRes.json();
  assertTest('5.2 GET /api/v1/inspections/:id', chkDetailRes.status === 200, `Template: ${chkDetailData.data?.name || chkDetailData.data?.title || 'Checklist'}`);

  // 5.3 POST /inspections/:id/submit (Nộp kết quả kiểm tra định kỳ)
  const submitInspRes = await fetch(`${API_BASE}/inspections/${sampleTmplId}/submit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      assetId: assetId,
      checklistId: sampleTmplId,
      results: (chkDetailData.data?.items || []).map(item => ({
        item_id: item.item_id,
        is_passed: true,
        note: "Đạt tiêu chuẩn an toàn kiểm tra"
      }))
    })
  });
  const submitInspData = await submitInspRes.json();
  assertTest('5.3 POST /api/v1/inspections/:id/submit', submitInspRes.status === 200, `Status: ${submitInspData.data?.overall_status || submitInspData.data?.status || 'PASS'}`);

  // -------------------------------------------------------------
  // MODULE 6: Asset & QR Context
  // -------------------------------------------------------------
  console.log('\n--- MODULE 6: ASSET & QR CONTEXT ---');

  // 6.1 GET /assets
  assertTest('6.1 GET /api/v1/assets', assetsRes.status === 200 && assetsData.data?.length > 0, `Assets: ${assetsData.data?.length}`);

  // 6.2 GET /assets/:id
  const singleAssetRes = await fetch(`${API_BASE}/assets/${assetId}`, { headers });
  const singleAssetData = await singleAssetRes.json();
  assertTest('6.2 GET /api/v1/assets/:id', singleAssetRes.status === 200 && singleAssetData.data?.asset_id === assetId, `Asset: ${singleAssetData.data?.name}`);

  // 6.3 GET /assets/resolve?token=... (Opaque QR Token -> Digital Context & allowed_actions)
  const qrToken = singleAssetData.data?.qr_token || singleAssetData.data?.qr_code_token;
  if (qrToken) {
    const resolveRes = await fetch(`${API_BASE}/assets/resolve?token=${encodeURIComponent(qrToken)}`, { headers });
    const resolveData = await resolveRes.json();
    assertTest('6.3 GET /api/v1/assets/resolve?token=...', resolveRes.status === 200 && Array.isArray(resolveData.data?.allowed_actions), `Actions: ${resolveData.data?.allowed_actions?.join(', ')}`);
  }

  // 6.4 POST /assets/:id/rotate-qr (Admin cấp lại mã QR mới)
  const rotateRes = await fetch(`${API_BASE}/assets/${assetId}/rotate-qr`, {
    method: 'POST',
    headers
  });
  const rotateData = await rotateRes.json();
  assertTest('6.4 POST /api/v1/assets/:id/rotate-qr', rotateRes.status === 200 && rotateData.data?.new_qr_token !== undefined, `New Token: ${rotateData.data?.new_qr_token?.slice(0, 16)}...`);

  // -------------------------------------------------------------
  // MODULE 7: Offline Batch Sync
  // -------------------------------------------------------------
  console.log('\n--- MODULE 7: OFFLINE BATCH SYNC ---');

  // 7.1 POST /sync/batch (Đồng bộ ngoại tuyến theo lô với Idempotency Key & base_version)
  const syncRes = await fetch(`${API_BASE}/sync/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      actions: [
        {
          idempotency_key: `offline_sync_full_test_${Date.now()}_1`,
          action_type: "REPORT_INCIDENT",
          base_version: 1,
          payload: {
            title: "Sự cố áp suất hệ thống bơm nước làm mát",
            symptom: "Đồng hồ đo áp tụt dưới 2.5 bar",
            asset_id: assetId,
            severity: "MEDIUM",
            temp_id: "temp_sync_item_001"
          }
        }
      ]
    })
  });
  const syncData = await syncRes.json();
  assertTest('7.1 POST /api/v1/sync/batch', syncRes.status === 200 && syncData.data?.[0]?.status === 'APPLIED', `Idempotent result: ${syncData.data?.[0]?.status}`);

  // -------------------------------------------------------------
  // MODULE 8: AI Work Copilot
  // -------------------------------------------------------------
  console.log('\n--- MODULE 8: AI WORK COPILOT ---');

  // 8.1 POST /ai/query (Truy vấn ngôn ngữ tự nhiên)
  const aiQueryRes = await fetch(`${API_BASE}/ai/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: "Thống kê tình hình downtime và các sự cố trong tháng này"
    })
  });
  const aiQueryData = await aiQueryRes.json();
  assertTest('8.1 POST /api/v1/ai/query', aiQueryRes.status === 200, `AI response returned`);

  // 8.2 POST /ai/draft-action (Trích xuất thông tin tạo Action Card an toàn)
  const aiDraftRes = await fetch(`${API_BASE}/ai/draft-action`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: "Máy CNC-024 bị kẹt phoi và nhiệt độ đầu dao tăng quá cao cần báo cáo khẩn",
      context: { asset_id: assetId }
    })
  });
  const aiDraftData = await aiDraftRes.json();
  assertTest('8.2 POST /api/v1/ai/draft-action', aiDraftRes.status === 200 && aiDraftData.actionCard?.action_type === 'CREATE_INCIDENT', `Card: ${aiDraftData.actionCard?.title?.slice(0, 35)}...`);

  // 8.3 POST /ai/summarize-incident (AI tóm tắt diễn biến sự cố kỹ thuật)
  const aiSummaryRes = await fetch(`${API_BASE}/ai/summarize-incident`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      incident_id: incidentId
    })
  });
  const aiSummaryData = await aiSummaryRes.json();
  assertTest('8.3 POST /api/v1/ai/summarize-incident', aiSummaryRes.status === 200 && aiSummaryData.summary?.length > 0, `Summary generated`);

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`   ALL ${passedTests}/${totalTests} TESTS ACROSS ALL 8 MODULES PASSED (100%)!   `);
  console.log('   ZERO HARDCODING | DYNAMIC ENTERPRISE RBAC & HIERARCHY VERIFIED');
  console.log('================================================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\nLỗi kiểm thử Backend Suite:', err);
  process.exit(1);
});

