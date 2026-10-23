import con from "../config/connect.js";

class Asset {
  static async getAll() {
    const res = await con.query(`
      SELECT 
        a.*,
        d.name AS department_name,
        (SELECT COUNT(*) FROM incidents inc WHERE inc.asset_id = a.asset_id) AS incident_count
      FROM assets a
      LEFT JOIN departments d ON a.department_id = d.department_id
      ORDER BY a.asset_id ASC
    `);
    return res.rows;
  }

  static async getById(assetId) {
    const res = await con.query(
      `SELECT a.*, d.name AS department_name 
       FROM assets a
       LEFT JOIN departments d ON a.department_id = d.department_id
       WHERE a.asset_id = $1`,
      [assetId]
    );
    return res.rows[0] || null;
  }

  /**
   * Resolve QR token để trả về Digital Context cho Mobile / Field Worker
   */
  static async resolveQrToken(token) {
    const assetRes = await con.query(
      `SELECT a.*, d.name AS department_name 
       FROM assets a
       LEFT JOIN departments d ON a.department_id = d.department_id
       WHERE a.qr_token = $1`,
      [token]
    );

    if (assetRes.rows.length === 0) {
      return null;
    }
    const asset = assetRes.rows[0];

    // Lấy các Incident đang mở của máy này
    const incidentsRes = await con.query(
      `SELECT 
         inc.*,
         t.name AS task_name,
         t.status_id,
         ws.name AS state_name,
         ws.color AS state_color,
         u.name AS reporter_name
       FROM incidents inc
       JOIN tasks t ON inc.task_id = t.task_id
       LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
       LEFT JOIN users u ON inc.reported_by = u.user_id
       WHERE inc.asset_id = $1 AND (ws.is_terminal IS NULL OR ws.is_terminal = false)
       ORDER BY inc.created_at DESC`,
      [asset.asset_id]
    );

    // Lấy danh sách Checklist kiểm tra gắn với máy này
    const checklistsRes = await con.query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM checklist_items ci WHERE ci.checklist_id = c.checklist_id) AS item_count
       FROM checklists c
       WHERE c.asset_id = $1 AND c.is_active = true`,
      [asset.asset_id]
    );

    return {
      asset,
      open_incidents: incidentsRes.rows,
      available_checklists: checklistsRes.rows,
    };
  }

  /**
   * Phase 4 – Digital Health Record & Asset Timeline
   *
   * Health Score (Option 1A): Operational scoring
   *   Base: 100
   *   - Open CRITICAL incident : -30
   *   - Open HIGH incident      : -20
   *   - Open MEDIUM incident    : -10
   *   - Open LOW incident       : -5
   *   - Latest inspection FAIL  : -15 (one-time penalty)
   *   Min score: 0
   *
   * Returns: { asset, healthScore, scoreBreakdown, openIncidents, recentInspections, timeline }
   */
  static async getHealthRecord(assetId) {
    // 1. Basic asset info
    const assetRes = await con.query(
      `SELECT a.*, d.name AS department_name
       FROM assets a
       LEFT JOIN departments d ON a.department_id = d.department_id
       WHERE a.asset_id = $1`,
      [assetId]
    );
    if (assetRes.rows.length === 0) return null;
    const asset = assetRes.rows[0];

    // 2. Open incidents (non-terminal workflow states)
    const openIncRes = await con.query(
      `SELECT
         inc.incident_id, inc.severity, inc.symptom, inc.created_at,
         t.name AS task_name,
         ws.name AS state_name, ws.color AS state_color,
         u.name AS reporter_name,
         inc.downtime_minutes
       FROM incidents inc
       JOIN tasks t ON inc.task_id = t.task_id
       LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
       LEFT JOIN users u ON inc.reported_by = u.user_id
       WHERE inc.asset_id = $1
         AND (ws.is_terminal IS NULL OR ws.is_terminal = false)
       ORDER BY inc.created_at DESC`,
      [assetId]
    );
    const openIncidents = openIncRes.rows;

    // 3. Health Score calculation (1A)
    const SEVERITY_PENALTY = { CRITICAL: 30, HIGH: 20, MEDIUM: 10, LOW: 5 };
    let score = 100;
    const scoreBreakdown = [];
    for (const inc of openIncidents) {
      const penalty = SEVERITY_PENALTY[inc.severity] || 5;
      score -= penalty;
      scoreBreakdown.push({
        reason: `Sự cố đang mở: ${inc.task_name}`,
        severity: inc.severity,
        delta: -penalty,
      });
    }

    // Last inspection result penalty
    const lastInspRes = await con.query(
      `SELECT ir.overall_status, ir.completed_at
       FROM inspection_runs ir
       JOIN checklists c ON ir.checklist_id = c.checklist_id
       WHERE c.asset_id = $1
       ORDER BY ir.completed_at DESC
       LIMIT 1`,
      [assetId]
    );
    const lastInspection = lastInspRes.rows[0] || null;
    if (lastInspection && lastInspection.overall_status === "FAIL") {
      score -= 15;
      scoreBreakdown.push({
        reason: "Kiểm tra định kỳ gần nhất: FAIL",
        delta: -15,
      });
    }
    score = Math.max(0, score);

    // 4. Recent inspection runs (last 10)
    const inspRunsRes = await con.query(
      `SELECT
         ir.run_id, ir.overall_status, ir.completed_at,
         c.title AS checklist_title,
         u.name AS inspector_name,
         (SELECT COUNT(*) FROM inspection_results r2 WHERE r2.run_id = ir.run_id AND r2.is_passed = false) AS failed_count,
         (SELECT COUNT(*) FROM inspection_results r3 WHERE r3.run_id = ir.run_id) AS total_count
       FROM inspection_runs ir
       JOIN checklists c ON ir.checklist_id = c.checklist_id
       LEFT JOIN users u ON ir.inspector_id = u.user_id
       WHERE c.asset_id = $1
       ORDER BY ir.completed_at DESC
       LIMIT 10`,
      [assetId]
    );
    const recentInspections = inspRunsRes.rows;

    // 5. All incidents (closed + open) for timeline — last 30
    const allIncRes = await con.query(
      `SELECT
         inc.incident_id, inc.severity, inc.symptom, inc.created_at,
         inc.resolved_at, inc.downtime_minutes,
         t.name AS task_name,
         ws.name AS state_name, ws.color AS state_color,
         ws.is_terminal,
         u.name AS reporter_name
       FROM incidents inc
       JOIN tasks t ON inc.task_id = t.task_id
       LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
       LEFT JOIN users u ON inc.reported_by = u.user_id
       WHERE inc.asset_id = $1
       ORDER BY inc.created_at DESC
       LIMIT 30`,
      [assetId]
    );

    // 6. Build unified timeline (2A): incidents + inspections merged & sorted
    const timelineEvents = [];

    for (const inc of allIncRes.rows) {
      timelineEvents.push({
        type: "INCIDENT",
        id: inc.incident_id,
        title: inc.task_name,
        subtitle: inc.symptom,
        severity: inc.severity,
        status: inc.is_terminal ? "RESOLVED" : "OPEN",
        state_name: inc.state_name,
        state_color: inc.state_color,
        downtime_minutes: inc.downtime_minutes,
        actor: inc.reporter_name,
        occurred_at: inc.created_at,
        resolved_at: inc.resolved_at,
      });
    }

    for (const run of recentInspections) {
      timelineEvents.push({
        type: "INSPECTION",
        id: run.run_id,
        title: `Kiểm tra: ${run.checklist_title}`,
        subtitle: `${run.failed_count}/${run.total_count} hạng mục không đạt`,
        status: run.overall_status,
        actor: run.inspector_name,
        occurred_at: run.completed_at,
      });
    }

    // Sort by occurred_at DESC
    timelineEvents.sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );

    // 6. Lấy lịch sử snapshots biến động điểm sức khỏe (Giai đoạn 1 Enterprise)
    const snapshotsRes = await con.query(
      `SELECT * FROM asset_health_snapshots 
       WHERE asset_id = $1 
       ORDER BY recorded_at DESC 
       LIMIT 20`,
      [assetId]
    );

    return {
      asset: {
        ...asset,
        health_score: asset.health_score ?? score,
      },
      healthScore: asset.health_score ?? score,
      scoreBreakdown,
      openIncidents,
      recentInspections,
      timeline: timelineEvents,
      snapshots: snapshotsRes.rows,
    };
  }

  /**
   * Tính toán và lưu cố định (Persist) Health Score vào Database kèm Snapshot
   */
  static async calculateAndPersistHealthScore(assetId, reason = "Cập nhật định kỳ", triggerType = "INCIDENT_CHANGE", metadata = {}, client = con) {
    if (!assetId) return null;

    try {
      // 1. Lấy điểm cũ
      const prevRes = await client.query(
        `SELECT health_score FROM assets WHERE asset_id = $1`,
        [assetId]
      );
      if (prevRes.rows.length === 0) return null;
      const prevScore = prevRes.rows[0].health_score ?? 100;

      // 2. Lấy các sự cố đang mở
      const openIncRes = await client.query(
        `SELECT inc.severity 
         FROM incidents inc
         JOIN tasks t ON inc.task_id = t.task_id
         LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
         WHERE inc.asset_id = $1 AND (ws.is_terminal IS NULL OR ws.is_terminal = false)`,
        [assetId]
      );

      const SEVERITY_PENALTY = { CRITICAL: 30, HIGH: 20, MEDIUM: 10, LOW: 5 };
      let newScore = 100;
      for (const inc of openIncRes.rows) {
        newScore -= (SEVERITY_PENALTY[inc.severity] || 5);
      }

      // 3. Phạt nếu lần kiểm tra gần nhất bị FAIL
      const lastInspRes = await client.query(
        `SELECT ir.overall_status 
         FROM inspection_runs ir
         JOIN checklists c ON ir.checklist_id = c.checklist_id
         WHERE c.asset_id = $1
         ORDER BY ir.completed_at DESC
         LIMIT 1`,
        [assetId]
      );
      if (lastInspRes.rows.length > 0 && lastInspRes.rows[0].overall_status === "FAIL") {
        newScore -= 15;
      }

      newScore = Math.max(0, Math.min(100, newScore));
      const delta = newScore - prevScore;

      // 4. Lưu cố định vào bảng assets
      await client.query(
        `UPDATE assets 
         SET health_score = $1, last_health_updated_at = CURRENT_TIMESTAMP 
         WHERE asset_id = $2`,
        [newScore, assetId]
      );

      // 5. Ghi nhận snapshot biến động điểm
      const snapRes = await client.query(
        `INSERT INTO asset_health_snapshots (asset_id, health_score, delta, reason, trigger_type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [assetId, newScore, delta, reason, triggerType, JSON.stringify(metadata)]
      );

      return {
        assetId,
        previousScore: prevScore,
        healthScore: newScore,
        delta,
        snapshot: snapRes.rows[0],
      };
    } catch (err) {
      console.error(`[Asset.calculateAndPersistHealthScore] Lỗi cho asset_id=${assetId}:`, err.message);
      return null;
    }
  }

  /**
   * Khởi tạo hoặc tính toán lại điểm sức khỏe cho toàn bộ tài sản
   */
  static async backfillAllAssetHealthScores() {
    const assetsRes = await con.query(`SELECT asset_id, name, asset_code FROM assets`);
    for (const a of assetsRes.rows) {
      await this.calculateAndPersistHealthScore(
        a.asset_id,
        "Khởi tạo hồ sơ sức khỏe ban đầu",
        "INIT"
      );
    }
    console.log(`[Asset] Đã tính toán và lưu Health Score cho ${assetsRes.rows.length} thiết bị.`);
  }

  static async create({ asset_code, name, location, department_id, qr_token, specs = {} }) {
    const token = qr_token || `QR-${asset_code}-${Date.now()}`;
    const res = await con.query(
      `INSERT INTO assets (asset_code, name, location, department_id, qr_token, specs, health_score)
       VALUES ($1, $2, $3, $4, $5, $6, 100) RETURNING *`,
      [asset_code, name, location, department_id, token, JSON.stringify(specs)]
    );
    return res.rows[0];
  }
}

export default Asset;
