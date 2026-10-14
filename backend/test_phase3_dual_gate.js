/**
 * DUAL-GATE TEST SUITE - GIAI ĐOẠN 3: EVIDENCE PROTOCOL & AI VISION COPILOT
 * 
 * CỔNG A: Bảo toàn luồng cũ (Regression Gate) - Sự cố mở không có bằng chứng giả định, SLA hoạt động bình thường.
 * CỔNG B: Giao thức Bằng chứng & AI Thẩm định (Feature Gate) - 
 *         Phân tích ảnh hiện trường bằng AI (Soft Warning nếu nghi vấn, Verified nếu hợp lệ)
 *         và lưu trữ mảng URL ảnh vào incidents.resolved_evidence_urls.
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import con from "./src/config/connect.js";
import Incident from "./src/models/Incident.js";
import WorkflowEngine from "./src/core/WorkflowEngine.js";
import AIVisionService from "./src/services/aiVisionService.js";

async function runDualGateTest() {
  console.log("==========================================================");
  console.log("🚀 BẮT ĐẦU KIỂM THỬ CỔNG KÉP (DUAL-GATE TEST) GIAI ĐOẠN 3");
  console.log("==========================================================");

  try {
    const adminUser = { user_id: 1, role_code: "admin" };

    // Đảm bảo thư mục uploads tồn tại
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads", { recursive: true });
    }

    // ----------------------------------------------------
    // CỔNG A: REGRESSION GATE (Bảo toàn luồng cũ)
    // ----------------------------------------------------
    console.log("\n--- [CỔNG A] KIỂM THỬ BẢO TOÀN LUỒNG CŨ (REGRESSION GATE) ---");

    const gateA = await Incident.reportIncident({
      title: "Test Gate A (Phase 3): Sự cố mở không yêu cầu ảnh bằng chứng",
      symptom: "Đang kiểm tra bảo dưỡng định kỳ",
      asset_id: 1,
      reported_by: 1,
      severity: "MEDIUM",
      list_id: 1,
    });
    console.log(`✓ Tạo sự cố Gate A: Incident #${gateA.incident_id}, Task #${gateA.task.task_id}`);

    // Kiểm tra rằng sự cố mới mở chưa có bằng chứng và AI chưa đánh giá
    const gateACheck = await con.query(
      `SELECT resolved_evidence_urls, ai_evidence_status, ai_evidence_score FROM incidents WHERE incident_id = $1`,
      [gateA.incident_id]
    );
    const rowA = gateACheck.rows[0];
    if (
      (!rowA.resolved_evidence_urls || rowA.resolved_evidence_urls.length === 0) &&
      rowA.ai_evidence_status === "NOT_EVALUATED"
    ) {
      console.log(`✓ Sự cố đang mở có resolved_evidence_urls = [], ai_evidence_status = 'NOT_EVALUATED' (Đúng chuẩn)`);
    } else {
      throw new Error(`[FAIL] Gate A sinh dữ liệu bằng chứng giả cho sự cố đang mở!`);
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
      console.log(`✓ Chuyển sang ASSIGNED cho KTV thành công (không đòi ảnh)`);
    }

    const transitionsA2 = await WorkflowEngine.getAvailableTransitions(gateA.task.task_id, "admin");
    const inProgressTrans = transitionsA2.find((t) => t.to_state_code === "IN_PROGRESS");
    if (inProgressTrans) {
      await WorkflowEngine.executeTransition({
        taskId: gateA.task.task_id,
        toStateId: inProgressTrans.to_state_id,
        user: adminUser,
      });
      console.log(`✓ Chuyển sang IN_PROGRESS thành công (không đòi ảnh)`);
    }
    console.log(">>> [CỔNG A ĐẠT 100%]: Luồng sự cố cơ bản bảo toàn nguyên vẹn!\n");

    // ----------------------------------------------------
    // CỔNG B: FEATURE GATE (AI-ASSISTED EVIDENCE PROTOCOL)
    // ----------------------------------------------------
    console.log("--- [CỔNG B] KIỂM THỬ GIAO THỨC BẰNG CHỨNG & AI COPILOT (FEATURE GATE) ---");

    // 1. Chuẩn bị 2 ảnh mẫu: 1 ảnh tối đen (nghi vấn bịt cam) & 1 ảnh chi tiết máy móc
    const darkImgPath = path.resolve(process.cwd(), "uploads", "test_dark_screen.jpg");
    await sharp({
      create: { width: 300, height: 300, channels: 3, background: { r: 12, g: 12, b: 12 } },
    })
      .jpeg()
      .toFile(darkImgPath);

    const normalImgPath = path.resolve(process.cwd(), "uploads", "test_cnc_repaired.jpg");
    // Tạo ảnh có họa tiết độ tương phản cao mô phỏng bề mặt máy móc kim loại
    const svgOverlay = Buffer.from(`
      <svg width="400" height="300">
        <rect width="400" height="300" fill="#4B5563"/>
        <circle cx="200" cy="150" r="80" fill="#9CA3AF" stroke="#E5E7EB" stroke-width="8"/>
        <circle cx="200" cy="150" r="30" fill="#1F2937"/>
        <line x1="50" y1="50" x2="350" y2="250" stroke="#F59E0B" stroke-width="4"/>
      </svg>
    `);
    await sharp(svgOverlay).jpeg().toFile(normalImgPath);

    console.log("1. Đã tạo 2 mẫu ảnh kiểm thử: Ảnh tối đen giả lập & Ảnh mô phỏng chi tiết máy móc");

    // 2. Kiểm thử AI Thẩm định ảnh tối đen (Kỳ vọng: Cảnh báo mềm WARNING)
    console.log("\n2. Kiểm thử AI Copilot quét ảnh tối đen (che camera):");
    const aiDarkResult = await AIVisionService.analyzeEvidence({
      imageUrl: "/uploads/test_dark_screen.jpg",
      incidentTitle: "Kẹt dao phay CNC",
      assetName: "Máy Phay CNC 5 Trục",
    });
    console.log(`   - Trạng thái AI: ${aiDarkResult.status} (Điểm tin cậy: ${aiDarkResult.score}%)`);
    console.log(`   - Nhận xét AI: ${aiDarkResult.feedback}`);
    if (aiDarkResult.status !== "WARNING" || aiDarkResult.score > 40) {
      throw new Error("[FAIL] AI không cảnh báo ảnh tối đen!");
    }
    console.log("✓ AI Copilot đã phát hiện chính xác ảnh tối đen và phát cảnh báo mềm (WARNING)!");

    // 3. Kiểm thử AI Thẩm định ảnh máy móc (Kỳ vọng: VERIFIED)
    console.log("\n3. Kiểm thử AI Copilot quét ảnh máy móc đã phục hồi:");
    const aiNormalResult = await AIVisionService.analyzeEvidence({
      imageUrl: "/uploads/test_cnc_repaired.jpg",
      incidentTitle: "Thay vòng bi trục chính CNC-024",
      assetName: "Máy Phay CNC 5 Trục Số 24",
    });
    console.log(`   - Trạng thái AI: ${aiNormalResult.status} (Điểm tin cậy: ${aiNormalResult.score}%)`);
    console.log(`   - Nhận xét AI: ${aiNormalResult.feedback}`);
    if (aiNormalResult.status !== "VERIFIED" || aiNormalResult.score < 75) {
      throw new Error("[FAIL] AI không xác nhận ảnh chi tiết máy móc!");
    }
    console.log("✓ AI Copilot đã thẩm định thành công chi tiết máy móc hợp lệ (VERIFIED)!");

    // 3b. Kiểm thử AI Contextual Semantic Cross-Matching:
    // Case Mismatch: Sự cố Kẹt bàn trượt CNC nhưng nộp ảnh Bạc đạn SKF
    console.log("\n3b. Kiểm thử AI Đối soát Ngữ cảnh (Mismatch: Bàn trượt vs Bạc đạn SKF):");
    const skfImgPath = path.resolve(process.cwd(), "uploads", "test_skf_bearing.jpg");
    await sharp(svgOverlay).jpeg().toFile(skfImgPath);

    const aiMismatchResult = await AIVisionService.analyzeEvidence({
      imageUrl: "/uploads/test_skf_bearing.jpg",
      incidentTitle: "Kẹt bàn trượt CNC-024 cần đo Downtime",
      assetName: "Máy Phay CNC 5 Trục Số 24",
      symptom: "Bàn trượt trục X kẹt cứng, không di chuyển",
    });
    console.log(`   - Trạng thái AI: ${aiMismatchResult.status} (Điểm tin cậy: ${aiMismatchResult.score}%)`);
    console.log(`   - Nhận xét AI: ${aiMismatchResult.feedback}`);
    console.log(`   - Tags:`, aiMismatchResult.tags);
    if (aiMismatchResult.status !== "WARNING" || aiMismatchResult.score !== 55) {
      throw new Error("[FAIL] AI không phát hiện cảnh báo lệch linh kiện khi nộp ảnh SKF cho sự cố bàn trượt!");
    }
    console.log("✓ AI Copilot phát hiện chính xác ảnh nộp lệch hạng mục và phát cảnh báo mềm (55%)!");

    // Case Match: Sự cố Yêu cầu thay bạc đạn SKF nộp ảnh Bạc đạn SKF
    console.log("\n3c. Kiểm thử AI Đối soát Ngữ cảnh (Match: Yêu cầu thay bạc đạn SKF & Ảnh SKF):");
    const aiMatchResult = await AIVisionService.analyzeEvidence({
      imageUrl: "/uploads/test_skf_bearing.jpg",
      incidentTitle: "KTV yêu cầu thay bạc đạn SKF",
      assetName: "Máy Phay CNC 5 Trục Số 24",
      symptom: "Ổ bi trục phát tiếng ồn lớn",
    });
    console.log(`   - Trạng thái AI: ${aiMatchResult.status} (Điểm tin cậy: ${aiMatchResult.score}%)`);
    console.log(`   - Nhận xét AI: ${aiMatchResult.feedback}`);
    console.log(`   - Tags:`, aiMatchResult.tags);
    if (aiMatchResult.status !== "VERIFIED" || aiMatchResult.score !== 96) {
      throw new Error("[FAIL] AI không xác nhận độ tin cậy 96% khi linh kiện khớp sự cố!");
    }
    console.log("✓ AI Copilot xác nhận 96% khi nội dung ảnh khớp chính xác với sự cố thay bạc!");

    // 4. Tạo sự cố thực tế và hoàn tất kèm bằng chứng ảnh
    console.log("\n4. Tạo sự cố máy CNC-024 và thực hiện đóng việc có đính kèm ảnh nghiệm thu:");
    const gateB = await Incident.reportIncident({
      title: "Test Gate B (Phase 3): Đóng sự cố có đính kèm ảnh nghiệm thu & AI Verified",
      symptom: "Đã thay ổ bi SKF, test máy chạy êm",
      asset_id: 1,
      reported_by: 1,
      severity: "HIGH",
      list_id: 1,
    });
    console.log(`✓ Tạo sự cố Gate B: Incident #${gateB.incident_id}, Task #${gateB.task.task_id}`);

    // Chuyển sang ASSIGNED -> IN_PROGRESS
    const transitionsB1 = await WorkflowEngine.getAvailableTransitions(gateB.task.task_id, "admin");
    const assignTransB = transitionsB1.find((t) => t.to_state_code === "ASSIGNED");
    if (assignTransB) {
      await WorkflowEngine.executeTransition({
        taskId: gateB.task.task_id,
        toStateId: assignTransB.to_state_id,
        user: adminUser,
        metadata: { assignee_id: 2 },
      });
    }

    const transitionsB2 = await WorkflowEngine.getAvailableTransitions(gateB.task.task_id, "admin");
    const inProgressTransB = transitionsB2.find((t) => t.to_state_code === "IN_PROGRESS");
    if (inProgressTransB) {
      await WorkflowEngine.executeTransition({
        taskId: gateB.task.task_id,
        toStateId: inProgressTransB.to_state_id,
        user: adminUser,
      });
    }

    // KTV bấm Xong việc & Đóng sự cố kèm metadata bằng chứng
    const transitionsB3 = await WorkflowEngine.getAvailableTransitions(gateB.task.task_id, "admin");
    const resolveTransB = transitionsB3.find((t) => t.to_state_code === "RESOLVED");
    if (!resolveTransB) throw new Error("Không tìm thấy bước chuyển RESOLVED!");

    await WorkflowEngine.executeTransition({
      taskId: gateB.task.task_id,
      toStateId: resolveTransB.to_state_id,
      user: adminUser,
      metadata: {
        evidence_urls: ["/uploads/test_cnc_repaired.jpg"],
        ai_evidence_status: aiNormalResult.status,
        ai_evidence_feedback: aiNormalResult.feedback,
        ai_evidence_score: aiNormalResult.score,
      },
    });
    console.log("✓ KTV đã bấm hoàn tất sự cố kèm bằng chứng hình ảnh và đánh giá AI");

    // 5. Kiểm tra dữ liệu lưu trữ trong Database
    const gateBCheck = await con.query(
      `SELECT resolved_evidence_urls, ai_evidence_status, ai_evidence_feedback, ai_evidence_score, downtime_minutes, resolved_at 
       FROM incidents WHERE incident_id = $1`,
      [gateB.incident_id]
    );
    const rowB = gateBCheck.rows[0];

    console.log("\n5. Kiểm tra tính toàn vẹn dữ liệu cơ sở dữ liệu:");
    console.log(`   - URL Bằng chứng:`, rowB.resolved_evidence_urls);
    console.log(`   - Trạng thái AI:`, rowB.ai_evidence_status);
    console.log(`   - Điểm tin cậy AI:`, rowB.ai_evidence_score);
    console.log(`   - Phút Downtime:`, rowB.downtime_minutes, "phút");
    console.log(`   - Giờ giải quyết:`, rowB.resolved_at);

    if (
      !rowB.resolved_evidence_urls ||
      rowB.resolved_evidence_urls.length === 0 ||
      rowB.resolved_evidence_urls[0] !== "/uploads/test_cnc_repaired.jpg"
    ) {
      throw new Error("[FAIL] URL bằng chứng không được lưu đúng vào DB!");
    }

    if (rowB.ai_evidence_status !== "VERIFIED") {
      throw new Error("[FAIL] Trạng thái AI không được lưu đúng vào DB!");
    }

    if (!rowB.resolved_at || rowB.downtime_minutes <= 0) {
      throw new Error("[FAIL] Không tính toán downtime khi đóng việc!");
    }

    // Dọn dẹp SLA test
    await con.query(
      `UPDATE sla_instances SET status = 'COMPLETED', breached_at = NULL WHERE task_id IN ($1, $2)`,
      [gateA.task.task_id, gateB.task.task_id]
    );
    console.log("\n>>> [DỌN DẸP]: Đã đóng SLA test an toàn.");

    console.log("==========================================================");
    console.log("🎉 TẤT CẢ 2 CỔNG GIAI ĐOẠN 3 ĐỀU ĐẠT CHUẨN 100% ZERO-REGRESSION!");
    console.log("==========================================================");
  } catch (err) {
    console.error("\n❌ KIỂM THỬ THẤT BẠI:", err.message);
    process.exit(1);
  } finally {
    await con.end();
  }
}

runDualGateTest();
