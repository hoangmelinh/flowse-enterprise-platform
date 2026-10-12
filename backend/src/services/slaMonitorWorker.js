import con from "../config/connect.js";
import NotificationService from "./notificationService.js";

/**
 * SLA Monitor Background Worker
 * Quét chu kỳ 60 giây một lần để kiểm tra các mức báo động SLA:
 * - AT_RISK (< 30 phút)
 * - BREACHED (Đã quá hạn deadline)
 * Tự động gửi cảnh báo in-app và Brevo Email (có bộ lọc chống spam 15 phút).
 */
class SlaMonitorWorker {
  static intervalId = null;

  static start(intervalMs = 60000) {
    if (this.intervalId) return;

    console.log(`[SlaMonitorWorker] Đã khởi động bộ quét giám sát SLA định kỳ (${intervalMs / 1000}s/lần)...`);
    
    // Chạy ngay lần đầu sau 5s khởi động
    setTimeout(() => {
      this.checkSlaStatus();
    }, 5000);

    this.intervalId = setInterval(() => {
      this.checkSlaStatus();
    }, intervalMs);
  }

  static stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[SlaMonitorWorker] Đã dừng bộ giám sát SLA.");
    }
  }

  static async checkSlaStatus() {
    try {
      const query = `
        SELECT 
          si.sla_instance_id,
          si.task_id,
          si.status as sla_status,
          si.deadline_at,
          si.warning_sent,
          t.name as task_name,
          inc.incident_id,
          COALESCE(inc.severity, 'MEDIUM') as severity,
          a.asset_code,
          ws.is_terminal,
          ws.code as current_state_code
        FROM sla_instances si
        JOIN tasks t ON si.task_id = t.task_id
        LEFT JOIN incidents inc ON t.task_id = inc.task_id
        LEFT JOIN assets a ON inc.asset_id = a.asset_id
        LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
        WHERE si.status NOT IN ('COMPLETED') 
          AND (ws.is_terminal IS NULL OR ws.is_terminal = FALSE)
          AND (ws.code IS NULL OR ws.code != 'ON_HOLD_PENDING_PARTS')
      `;

      const res = await con.query(query);
      const now = new Date();

      for (const row of res.rows) {
        const deadline = new Date(row.deadline_at);
        const diffMs = deadline.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        // 1. Quá hạn deadline -> Chuyển thành BREACHED
        if (diffMs <= 0 && row.sla_status !== "BREACHED") {
          await con.query(
            `UPDATE sla_instances 
             SET status = 'BREACHED', breached_at = CURRENT_TIMESTAMP 
             WHERE sla_instance_id = $1`,
            [row.sla_instance_id]
          );

          console.warn(`[SLA Alert] Sự cố #${row.incident_id || row.task_id} ("${row.task_name}") ĐÃ BỊ VỠ SLA (BREACHED)!`);

          await NotificationService.dispatchIncidentAlert({
            incidentId: row.incident_id || row.task_id,
            taskId: row.task_id,
            taskName: row.task_name,
            assetCode: row.asset_code,
            severity: row.severity,
            type: "SLA_BREACHED",
            priority: "URGENT",
            slaDeadline: row.deadline_at,
            customMessage: `🚨 [BÁO ĐỘNG ĐỎ] Sự cố "${row.task_name}" trên thiết bị ${row.asset_code || "N/A"} ĐÃ QUÁ HẠN SLA!`,
          });
        } 
        // 2. Sắp hết hạn trong vòng 30 phút -> Chuyển thành AT_RISK & gửi cảnh báo vàng
        else if (diffMinutes <= 30 && diffMinutes > 0 && !row.warning_sent && row.sla_status === "IN_SLA") {
          await con.query(
            `UPDATE sla_instances 
             SET status = 'AT_RISK', warning_sent = TRUE 
             WHERE sla_instance_id = $1`,
            [row.sla_instance_id]
          );

          console.warn(`[SLA Warning] Sự cố #${row.incident_id || row.task_id} ("${row.task_name}") SẮP HẾT HẠN SLA (còn ${diffMinutes} phút)!`);

          await NotificationService.dispatchIncidentAlert({
            incidentId: row.incident_id || row.task_id,
            taskId: row.task_id,
            taskName: row.task_name,
            assetCode: row.asset_code,
            severity: row.severity,
            type: "SLA_AT_RISK",
            priority: "HIGH",
            slaDeadline: row.deadline_at,
            customMessage: `⚠️ [CẢNH BÁO VÀNG] Sự cố "${row.task_name}" (Thiết bị ${row.asset_code || "N/A"}) chỉ còn ${diffMinutes} phút nữa là hết hạn SLA!`,
          });
        }
      }
    } catch (err) {
      console.error("[SlaMonitorWorker] Lỗi trong chu kỳ quét SLA:", err.message);
    }
  }
}

export default SlaMonitorWorker;
