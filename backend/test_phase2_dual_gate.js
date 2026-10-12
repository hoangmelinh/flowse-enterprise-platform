/**
 * DUAL-GATE TEST SUITE - GIAI ĐOẠN 2: DOWNTIME & MTTR
 * 
 * CỔNG A: Bảo toàn luồng cũ (Regression Gate) - Sự cố mở không có downtime giả định, SLA hoạt động bình thường.
 * CỔNG B: Đo lường Downtime & MTTR (Feature Gate) - Đóng sự cố tự động tính số phút dừng máy và cập nhật MTTR phân xưởng.
 */

import con from "./src/config/connect.js";
import Incident from "./src/models/Incident.js";
import WorkflowEngine from "./src/core/WorkflowEngine.js";

async function runDualGateTest() {
  console.log("==========================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ CỔNG KÉP (DUAL-GATE TEST) GIAI ĐOẠN 2");
  console.log("==========================================================");

  try {
    const adminUser = { user_id: 1, role_code: "admin" };

    // ----------------------------------------------------
    // CỔNG A: REGRESSION GATE
    // ----------------------------------------------------
    console.log("\n--- [CỔNG A] KIỂM THỬ BẢO TOÀN LUỒNG CŨ (REGRESSION GATE) ---");

    const gateA = await Incident.reportIncident({
      title: "Test Gate A (Phase 2): Sự cố đang xử lý không có downtime",
      symptom: "Đang kiểm tra bảo dưỡng định kỳ",
      asset_id: 1,
      reported_by: 1,
      severity: "MEDIUM",
      list_id: 1,
    });
    console.log(`✓ Tạo sự cố Gate A: Incident #${gateA.incident_id}, Task #${gateA.task.task_id}`);

    // Kiểm tra rằng sự cố mới mở chưa có downtime
    const gateACheck = await con.query(
      `SELECT resolved_at, downtime_minutes FROM incidents WHERE incident_id = $1`,
      [gateA.incident_id]
    );
    if (gateACheck.rows[0].resolved_at === null && gateACheck.rows[0].downtime_minutes === 0) {
      console.log(`✓ Sự cố đang mở có resolved_at = null, downtime_minutes = 0 (Đúng chuẩn không sinh downtime giả)`);
    } else {
      throw new Error(`[FAIL] Gate A sinh downtime giả cho sự cố đang mở!`);
    }

    // Chuyển sang ASSIGNED -> IN_PROGRESS
    const transitionsA = await WorkflowEngine.getAvailableTransitions(gateA.task.task_id, "admin");
    const assignTrans = transitionsA.find((t) => t.to_state_code === "ASSIGNED");
    if (assignTrans) {
      await WorkflowEngine.executeTransition({
        taskId: gateA.task.task_id,
        toStateId: assignTrans.to_state_id,
        user: adminUser,
        metadata: { assignee_id: 2 },
      });
      console.log(`✓ Chuyển sang ASSIGNED cho KTV thành công`);
    }

    const transitionsA2 = await WorkflowEngine.getAvailableTransitions(gateA.task.task_id, "admin");
    const inProgressTrans = transitionsA2.find((t) => t.to_state_code === "IN_PROGRESS");
    if (inProgressTrans) {
      await WorkflowEngine.executeTransition({
        taskId: gateA.task.task_id,
        toStateId: inProgressTrans.to_state_id,
        user: adminUser,
      });
      console.log(`✓ Chuyển sang IN_PROGRESS thành công`);
    }

    console.log(">>> [CỔNG A ĐẠT 100%]: Luồng sự cố đang mở bảo toàn nguyên vẹn!\n");

    // ----------------------------------------------------
    // CỔNG B: FEATURE GATE (DOWNTIME & MTTR METRICS)
    // ----------------------------------------------------
    console.log("--- [CỔNG B] KIỂM THỬ TÍNH DOWNTIME & MTTR PHÂN XƯỞNG (FEATURE GATE) ---");

    const statsBefore = await Incident.getDowntimeAndMTTRStats();
    console.log(`✓ Thống kê phân xưởng trước khi đóng máy:`);
    console.log(`   - Tổng Downtime: ${statsBefore.totalDowntimeMinutes} phút (${statsBefore.formattedTotalDowntime})`);
    console.log(`   - MTTR trung bình: ${statsBefore.mttrMinutes} phút/sự cố`);
    console.log(`   - Đã giải quyết: ${statsBefore.resolvedIncidents} sự cố`);

    // 1. Tạo sự cố máy CNC-024
    const gateB = await Incident.reportIncident({
      title: "Test Gate B (Phase 2): Kẹt bàn trượt CNC-024 cần đo Downtime",
      symptom: "Bàn trượt trục Y bị rơ dơ lệch chuẩn 0.05mm",
      asset_id: 1,
      reported_by: 1,
      severity: "HIGH",
      list_id: 1,
    });
    console.log(`\n1. Tạo sự cố máy CNC-024: Incident #${gateB.incident_id}, Task #${gateB.task.task_id}`);

    // Giả lập thời gian máy chạy / sửa chữa (chờ 1.5 giây)
    console.log("2. KTV đến sửa chữa và hoàn tất (chờ 1.5s giả lập)...");
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Chuyển sang ASSIGNED -> IN_PROGRESS -> RESOLVED
    const allTransB = await WorkflowEngine.getAvailableTransitions(gateB.task.task_id, "admin");
    const toAssign = allTransB.find((t) => t.to_state_code === "ASSIGNED");
    if (toAssign) {
      await WorkflowEngine.executeTransition({
        taskId: gateB.task.task_id,
        toStateId: toAssign.to_state_id,
        user: adminUser,
        metadata: { assignee_id: 2 },
      });
    }

    const transB2 = await WorkflowEngine.getAvailableTransitions(gateB.task.task_id, "admin");
    const toProg = transB2.find((t) => t.to_state_code === "IN_PROGRESS");
    if (toProg) {
      await WorkflowEngine.executeTransition({
        taskId: gateB.task.task_id,
        toStateId: toProg.to_state_id,
        user: adminUser,
      });
    }

    const transB3 = await WorkflowEngine.getAvailableTransitions(gateB.task.task_id, "admin");
    const toRes = transB3.find((t) => t.to_state_code === "RESOLVED" || t.is_terminal);
    if (toRes) {
      await WorkflowEngine.executeTransition({
        taskId: gateB.task.task_id,
        toStateId: toRes.to_state_id,
        user: adminUser,
        note: "Đã hoàn thành sửa chữa bàn trượt quang học",
      });
      console.log(`✓ KTV đã bấm [Xong việc & Đóng sự cố] sang trạng thái RESOLVED`);
    } else {
      throw new Error(`Không tìm thấy bước chuyển sang RESOLVED cho Task #${gateB.task.task_id}`);
    }

    // 3. Kiểm tra bản ghi incidents sau khi hoàn tất
    const incAfterRes = await con.query(
      `SELECT resolved_at, downtime_minutes, created_at FROM incidents WHERE incident_id = $1`,
      [gateB.incident_id]
    );
    const incAfter = incAfterRes.rows[0];
    console.log(`\n3. Kiểm tra tính toán Downtime tự động:`);
    console.log(`✓ Thời điểm tạo: ${incAfter.created_at}`);
    console.log(`✓ Thời điểm khắc phục (resolved_at): ${incAfter.resolved_at}`);
    console.log(`✓ Thời gian dừng máy (downtime_minutes): ${incAfter.downtime_minutes} phút`);

    if (!incAfter.resolved_at || incAfter.downtime_minutes < 1) {
      throw new Error(`[FAIL] Downtime không được ghi nhận chuẩn xác sau khi đóng sự cố!`);
    }

    // 4. Kiểm tra cập nhật thống kê MTTR phân xưởng
    const statsAfter = await Incident.getDowntimeAndMTTRStats();
    console.log(`\n4. Kiểm tra thống kê KPI phân xưởng sau khi máy chạy lại:`);
    console.log(`✓ Tổng Downtime mới: ${statsAfter.totalDowntimeMinutes} phút (${statsAfter.formattedTotalDowntime})`);
    console.log(`✓ MTTR mới: ${statsAfter.mttrMinutes} phút/sự cố`);
    console.log(`✓ Số sự cố đã đóng tăng từ ${statsBefore.resolvedIncidents} lên ${statsAfter.resolvedIncidents}`);
    console.log(`✓ Top thiết bị dừng máy:`);
    statsAfter.topDowntimeAssets.forEach((a) => {
      console.log(`   - [${a.asset_code}] ${a.asset_name}: ${a.total_downtime_minutes} phút (${a.incident_count} lần hỏng)`);
    });

    if (statsAfter.resolvedIncidents <= statsBefore.resolvedIncidents) {
      throw new Error(`[FAIL] Số lượng sự cố resolved không tăng trong báo cáo KPI!`);
    }

    // Dọn dẹp SLA instance để không gây alert nền
    await con.query(
      `UPDATE sla_instances SET status = 'COMPLETED', breached_at = NULL WHERE task_id IN ($1, $2)`,
      [gateA.task.task_id, gateB.task.task_id]
    );
    console.log(`\n>>> [DỌN DẸP]: Đã đóng SLA test an toàn.`);

    console.log("\n==========================================================");
    console.log("🎉 TẤT CẢ 2 CỔNG GIAI ĐOẠN 2 ĐỀU ĐẠT CHUẨN 100% ZERO-REGRESSION!");
    console.log("==========================================================");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ CỔNG KÉP:", err);
    process.exit(1);
  }
}

runDualGateTest();
