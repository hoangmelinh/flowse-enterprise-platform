import con from "../config/connect.js";
import Incident from "./Incident.js";

class Inspection {
  /**
   * Lấy danh mục toàn bộ mẫu checklist định kỳ (Inspection Templates per API Contract 2.5)
   */
  static async getAllTemplates() {
    const query = `
      SELECT c.*,
        a.name AS asset_name,
        a.asset_code,
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.checklist_id = c.checklist_id) AS item_count
      FROM checklists c
      LEFT JOIN assets a ON c.asset_id = a.asset_id
      WHERE c.is_active = true
      ORDER BY c.checklist_id ASC
    `;
    const res = await con.query(query);
    return res.rows;
  }

  /**
   * Lấy chi tiết một checklist template kèm danh sách câu hỏi theo ID
   */
  static async getById(checklistId) {
    const query = `
      SELECT c.*, 
        a.name AS asset_name,
        a.asset_code,
        json_agg(
          json_build_object(
            'item_id', ci.item_id,
            'question', ci.question,
            'require_evidence', ci.require_evidence,
            'fail_severity', ci.fail_severity,
            'position', ci.position
          ) ORDER BY ci.position ASC
        ) AS items
      FROM checklists c
      LEFT JOIN assets a ON c.asset_id = a.asset_id
      LEFT JOIN checklist_items ci ON c.checklist_id = ci.checklist_id
      WHERE c.checklist_id = $1
      GROUP BY c.checklist_id, a.name, a.asset_code
    `;
    const res = await con.query(query, [checklistId]);
    return res.rows[0] || null;
  }

  /**
   * Lấy checklist và danh sách các câu hỏi kiểm tra của một thiết bị
   */
  static async getChecklistByAsset(assetId) {
    let query = `
      SELECT c.*, 
        json_agg(
          json_build_object(
            'item_id', ci.item_id,
            'question', ci.question,
            'require_evidence', ci.require_evidence,
            'fail_severity', ci.fail_severity,
            'position', ci.position
          ) ORDER BY ci.position ASC
        ) AS items
      FROM checklists c
      LEFT JOIN checklist_items ci ON c.checklist_id = ci.checklist_id
      WHERE c.asset_id = $1 AND c.is_active = true
      GROUP BY c.checklist_id
    `;
    let res = await con.query(query, [assetId]);

    // Nếu thiết bị này chưa có checklist riêng, lấy checklist chung mặc định đầu tiên
    if (res.rows.length === 0) {
      query = `
        SELECT c.*, 
          json_agg(
            json_build_object(
              'item_id', ci.item_id,
              'question', ci.question,
              'require_evidence', ci.require_evidence,
              'fail_severity', ci.fail_severity,
              'position', ci.position
            ) ORDER BY ci.position ASC
          ) AS items
        FROM checklists c
        LEFT JOIN checklist_items ci ON c.checklist_id = ci.checklist_id
        WHERE c.is_active = true
        GROUP BY c.checklist_id
        LIMIT 1
      `;
      res = await con.query(query);
    }

    return res.rows[0] || null;
  }

  /**
   * Nộp kết quả kiểm tra định kỳ (Inspection Run)
   * Tự động sinh Incident nếu có bất kỳ mục nào FAIL
   */
  static async submitRun({ assetId, checklistId, inspectorId, results = [] }) {
    const client = await con.connect();
    try {
      await client.query("BEGIN");

      const hasFail = results.some((r) => r.isPassed === false || r.is_passed === false);
      const overallStatus = hasFail ? "FAIL" : "PASS";

      // 1. Tạo bản ghi inspection_runs
      const runRes = await client.query(
        `INSERT INTO inspection_runs (checklist_id, inspector_id, overall_status, completed_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         RETURNING *`,
        [checklistId || null, inspectorId || null, overallStatus]
      );
      const run = runRes.rows[0];

      // 2. Lưu từng kết quả item vào inspection_results
      const failedItems = [];
      for (const item of results) {
        const isPassed = item.isPassed !== undefined ? item.isPassed : item.is_passed;
        const itemId = item.itemId || item.item_id;
        const note = item.note || "";
        const evidenceUrl = item.evidenceUrl || item.evidence_url || null;

        await client.query(
          `INSERT INTO inspection_results (run_id, item_id, is_passed, note, evidence_url)
           VALUES ($1, $2, $3, $4, $5)`,
          [run.run_id, itemId, isPassed, note, evidenceUrl]
        );

        if (!isPassed) {
          // Lấy câu hỏi để ghi nhận lỗi
          const qRes = await client.query(`SELECT question, fail_severity FROM checklist_items WHERE item_id = $1`, [itemId]);
          failedItems.push({
            question: qRes.rows[0]?.question || `Hạng mục kiểm tra #${itemId}`,
            severity: qRes.rows[0]?.fail_severity || "HIGH",
            note,
          });
        }
      }

      await client.query("COMMIT");

      // 3. Nếu có FAIL -> Tự động kích hoạt tạo Sự cố mới ngoài Transaction
      let autoIncident = null;
      if (hasFail && failedItems.length > 0) {
        const maxSeverity = failedItems.some((f) => f.severity === "CRITICAL")
          ? "CRITICAL"
          : "HIGH";

        const failDescriptions = failedItems
          .map((f, idx) => `${idx + 1}. ${f.question} -> Ghi chú: ${f.note || "Không đạt chuẩn"}`)
          .join("\n");

        autoIncident = await Incident.reportIncident({
          title: `[Tự động từ Checklist Run #${run.run_id}] Phát hiện lỗi thiết bị`,
          symptom: `Kiểm tra định kỳ không đạt (${failedItems.length} hạng mục FAIL):\n${failDescriptions}`,
          asset_id: assetId,
          reported_by: inspectorId,
          severity: maxSeverity,
        });
      } else if (assetId) {
        // Nếu PASS toàn bộ, vẫn cập nhật lại Health Score để ghi nhận kiểm tra đạt
        import("./Asset.js").then(({ default: Asset }) => {
          Asset.calculateAndPersistHealthScore(
            assetId,
            `Hoàn thành kiểm tra định kỳ [${overallStatus}]`,
            "INSPECTION_RUN",
            { run_id: run.run_id, overall_status: overallStatus }
          ).catch((err) => console.error("[Inspection] Lỗi cập nhật health score:", err.message));
        });
      }

      return {
        run,
        overallStatus,
        failedCount: failedItems.length,
        autoIncident,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export default Inspection;
