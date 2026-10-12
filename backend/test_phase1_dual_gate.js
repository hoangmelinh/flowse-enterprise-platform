import con from "./src/config/connect.js";
import Incident from "./src/models/Incident.js";
import Approval from "./src/models/Approval.js";

async function runDualGateTest() {
  console.log("==========================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ CỔNG KÉP (DUAL-GATE TEST) GIAI ĐOẠN 1");
  console.log("==========================================================");

  try {
    // Lấy 1 asset và 1 user để test
    const userRes = await con.query("SELECT user_id FROM users LIMIT 1");
    const assetRes = await con.query("SELECT asset_id FROM assets LIMIT 1");

    if (userRes.rows.length === 0 || assetRes.rows.length === 0) {
      throw new Error("Cần có ít nhất 1 user và 1 asset trong DB để test");
    }

    const testUserId = userRes.rows[0].user_id;
    const testAssetId = assetRes.rows[0].asset_id;

    // -----------------------------------------------------------------
    // 🚪 CỔNG A: REGRESSION GATE (Bảo toàn luồng cũ)
    // -----------------------------------------------------------------
    console.log("\n--- [CỔNG A] KIỂM THỬ BẢO TOÀN LUỒNG CŨ (REGRESSION GATE) ---");
    const regIncident = await Incident.reportIncident({
      asset_id: testAssetId,
      reported_by: testUserId,
      title: "Test Gate A: Sửa chữa thông thường không xin vật tư",
      symptom: "Máy kêu nhỏ, kiểm tra định kỳ",
      severity: "MEDIUM",
      list_id: 1,
    });
    console.log(`✓ Tạo sự cố Gate A thành công: Incident #${regIncident.incident_id}, Task #${regIncident.task_id}`);

    // Kiểm tra SLA ban đầu
    const slaARes = await con.query(
      "SELECT * FROM sla_instances WHERE task_id = $1",
      [regIncident.task_id]
    );
    console.log(`✓ SLA Gate A khởi tạo: Status = ${slaARes.rows[0]?.status || 'N/A'}, Deadline = ${slaARes.rows[0]?.deadline_at}`);

    if (slaARes.rows[0]?.status !== "IN_SLA") {
      throw new Error("Cổng A Thất Bại: SLA không ở trạng thái IN_SLA");
    }
    console.log(">>> [CỔNG A ĐẠT 100%]: Luồng tạo sự cố cơ bản không bị ảnh hưởng!");

    // -----------------------------------------------------------------
    // 🚪 CỔNG B: FEATURE GATE (Liên thông Vật tư & Đóng băng/Bù giờ SLA)
    // -----------------------------------------------------------------
    console.log("\n--- [CỔNG B] KIỂM THỬ LIÊN THÔNG VẬT TƯ & BÙ GIỜ SLA (FEATURE GATE) ---");
    const featIncident = await Incident.reportIncident({
      asset_id: testAssetId,
      reported_by: testUserId,
      title: "Test Gate B: KTV yêu cầu thay bạc đạn SKF",
      symptom: "Bạc đạn bị kẹt cứng cần thay thế",
      severity: "HIGH",
      list_id: 1,
    });
    console.log(`✓ Tạo sự cố Gate B: Incident #${featIncident.incident_id}, Task #${featIncident.task_id}`);

    const slaBBefore = await con.query(
      "SELECT * FROM sla_instances WHERE task_id = $1",
      [featIncident.task_id]
    );
    const originalDeadline = new Date(slaBBefore.rows[0].deadline_at).getTime();
    console.log(`✓ SLA Gate B trước khi xin vật tư: Status = ${slaBBefore.rows[0].status}, Deadline = ${slaBBefore.rows[0].deadline_at}`);

    // B1: KTV xin vật tư
    console.log("\n1. KTV bấm xin vật tư...");
    const reqPartsRes = await Incident.requestSpareParts({
      incidentId: featIncident.incident_id,
      partName: "Bạc đạn SKF 6204",
      quantity: 2,
      reason: "Bạc đạn cũ bị mòn và rơ",
      requestedBy: testUserId,
    });
    console.log(`✓ Tạo phiếu đề xuất: Approval #${reqPartsRes.approval_id}`);

    // Kiểm tra trạng thái SLA sau khi xin vật tư (Phải là PAUSED)
    const slaBPaused = await con.query(
      "SELECT * FROM sla_instances WHERE task_id = $1",
      [featIncident.task_id]
    );
    console.log(`✓ Trạng thái SLA sau khi xin vật tư: Status = ${slaBPaused.rows[0].status}, Paused At = ${slaBPaused.rows[0].paused_at}`);

    if (slaBPaused.rows[0].status !== "PAUSED" || !slaBPaused.rows[0].paused_at) {
      throw new Error("Cổng B Thất Bại: SLA chưa được chuyển sang PAUSED hoặc thiếu paused_at");
    }

    // Kiểm tra bảng approvals có incident_id không
    const appRec = await con.query(
      "SELECT * FROM approvals WHERE approval_id = $1",
      [reqPartsRes.approval_id]
    );
    console.log(`✓ Kiểm tra liên kết Approval: approval_id = ${appRec.rows[0].approval_id}, incident_id = ${appRec.rows[0].incident_id}`);

    if (parseInt(appRec.rows[0].incident_id, 10) !== featIncident.incident_id) {
      throw new Error("Cổng B Thất Bại: approvals.incident_id không khớp với incident_id");
    }

    // Giả lập thời gian chờ 2 giây để đo delta bù giờ
    console.log("\n2. Chờ 2 giây giả lập thời gian Quản đốc xem xét và duyệt...");
    await new Promise((r) => setTimeout(r, 2000));

    // B2: Quản đốc bấm Phê duyệt
    console.log("3. Quản đốc bấm PHÊ DUYỆT (APPROVED)...");
    await Approval.makeDecision({
      approvalId: reqPartsRes.approval_id,
      approverId: testUserId,
      status: "APPROVED",
      decisionNote: "Đồng ý xuất kho 2 bạc đạn SKF 6204",
    });

    // B3: Kiểm tra tự động phục hồi sự cố về IN_PROGRESS
    const taskStateRes = await con.query(
      `SELECT t.task_id, ws.code as state_code 
       FROM tasks t 
       JOIN workflow_states ws ON t.current_state_id = ws.state_id 
       WHERE t.task_id = $1`,
      [featIncident.task_id]
    );
    console.log(`✓ Trạng thái sự cố sau khi duyệt: ${taskStateRes.rows[0].state_code}`);
    if (taskStateRes.rows[0].state_code !== "IN_PROGRESS") {
      throw new Error(`Cổng B Thất Bại: Sự cố chưa tự động chuyển về IN_PROGRESS (Hiện tại: ${taskStateRes.rows[0].state_code})`);
    }

    // B4: Kiểm tra SLA đã phục hồi và dời deadline_at chưa
    const slaBResumed = await con.query(
      "SELECT * FROM sla_instances WHERE task_id = $1",
      [featIncident.task_id]
    );
    const newDeadline = new Date(slaBResumed.rows[0].deadline_at).getTime();
    const deltaMs = newDeadline - originalDeadline;

    console.log(`✓ Trạng thái SLA sau khi duyệt: Status = ${slaBResumed.rows[0].status}, Paused At = ${slaBResumed.rows[0].paused_at}`);
    console.log(`✓ Hạn chót cũ: ${new Date(originalDeadline).toISOString()}`);
    console.log(`✓ Hạn chót mới: ${new Date(newDeadline).toISOString()}`);
    console.log(`✓ Thời gian bù giờ thêm (Delta): ${Math.round(deltaMs / 1000)} giây`);

    if (slaBResumed.rows[0].status !== "IN_SLA" || slaBResumed.rows[0].paused_at !== null) {
      throw new Error("Cổng B Thất Bại: SLA chưa phục hồi về IN_SLA hoặc paused_at chưa reset");
    }

    if (deltaMs < 1500) {
      throw new Error("Cổng B Thất Bại: SLA deadline chưa được cộng dồn thời gian chờ");
    }

    console.log(">>> [CỔNG B ĐẠT 100%]: Liên thông phê duyệt vật tư & bù giờ SLA hoạt động hoàn hảo!");

    console.log("\n==========================================================");
    console.log("🎉 TẤT CẢ 2 CỔNG ĐỀU ĐẠT CHUẨN 100% ZERO-REGRESSION!");
    console.log("==========================================================");
  } catch (err) {
    console.error("\n❌ LỖI KIỂM THỬ:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runDualGateTest();
