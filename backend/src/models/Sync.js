import con from "../config/connect.js";
import WorkflowEngine from "../core/WorkflowEngine.js";
import Incident from "./Incident.js";
import Inspection from "./Inspection.js";

class Sync {
  /**
   * Xử lý batch actions gửi lên từ Mobile/Client sau khi có mạng trở lại
   */
  static async processBatchSync(userId, actions = []) {
    const results = [];
    const tempIdToRealIdMap = new Map(); // Ánh xạ ID tạm (temp_id) sang ID thật trên Server

    for (const act of actions) {
      const { idempotency_key, action_type, payload, base_version, force_apply } = act;

      // 1. Kiểm tra idempotency: Nếu action này đã xử lý trước đó rồi thì trả về kết quả cũ
      const existing = await con.query(
        `SELECT * FROM offline_sync_logs WHERE idempotency_key = $1`,
        [idempotency_key]
      );
      if (existing.rows.length > 0) {
        results.push({
          idempotency_key,
          status: "ALREADY_APPLIED",
          result: existing.rows[0],
        });
        continue;
      }

      // 2. Xử lý từng loại action
      try {
        let actionResult = null;
        let serverVersion = 1;

        // --- Hành động 1: BÁO CÁO SỰ CỐ MỚI (REPORT_INCIDENT) ---
        if (action_type === "REPORT_INCIDENT") {
          const { title, symptom, asset_id, severity, evidence_urls, list_id, temp_id } = payload;
          
          actionResult = await Incident.reportIncident({
            title,
            symptom,
            asset_id,
            reported_by: userId,
            severity: severity || "MEDIUM",
            evidence_urls: evidence_urls || [],
            list_id: list_id || null,
          });

          if (temp_id && actionResult?.incident_id) {
            tempIdToRealIdMap.set(temp_id, actionResult.incident_id);
            if (actionResult.task_id) {
              tempIdToRealIdMap.set(`task_${temp_id}`, actionResult.task_id);
            }
          }
          serverVersion = 1;
        }

        // --- Hành động 2: CHUYỂN TRẠNG THÁI QUY TRÌNH FSM (WORKFLOW_TRANSITION) ---
        else if (action_type === "WORKFLOW_TRANSITION") {
          let { task_id, to_state_id, note, evidence_urls, assignee_id } = payload;

          // Nếu task_id là ID tạm từ hành động trước, thay thế bằng ID thật
          if (typeof task_id === "string" && tempIdToRealIdMap.has(task_id)) {
            task_id = tempIdToRealIdMap.get(task_id);
          } else if (typeof task_id === "string" && tempIdToRealIdMap.has(`task_${task_id}`)) {
            task_id = tempIdToRealIdMap.get(`task_${task_id}`);
          }

          // Kiểm tra optimistic lock version (Nếu không phải force_apply)
          const taskRes = await con.query(
            `SELECT t.task_id, t.version, t.name, ws.name as current_state_name, ws.code as current_state_code 
             FROM tasks t
             LEFT JOIN workflow_states ws ON t.current_state_id = ws.state_id
             WHERE t.task_id = $1`,
            [task_id]
          );

          if (taskRes.rows.length > 0) {
            const currentTask = taskRes.rows[0];
            serverVersion = currentTask.version;

            if (!force_apply && base_version && currentTask.version !== base_version) {
              // Xung đột phiên bản (409 Conflict)
              await con.query(
                `INSERT INTO offline_sync_logs (user_id, idempotency_key, action_type, payload, base_version, server_version, status, conflict_detail)
                 VALUES ($1, $2, $3, $4, $5, $6, 'CONFLICT', $7)`,
                [userId, idempotency_key, action_type, JSON.stringify(payload), base_version, currentTask.version, "Task has been updated by another user."]
              );

              results.push({
                idempotency_key,
                status: "CONFLICT",
                message: `Bản ghi đã được người khác cập nhật lên phiên bản v${currentTask.version} (Trạng thái hiện tại: ${currentTask.current_state_name}).`,
                server_record: currentTask,
              });
              continue;
            }
          }

          // Thực hiện transition với quyền hạn ngữ cảnh động (Dynamic Contextual RBAC)
          actionResult = await WorkflowEngine.executeTransition({
            taskId: task_id,
            toStateId: to_state_id,
            user: { user_id: userId },
            note: note || (force_apply ? "[Ghi đè xung đột] Đồng bộ ngoại tuyến" : "Đồng bộ ngoại tuyến"),
            metadata: {
              evidence_urls: evidence_urls || payload.evidence_urls,
              assignee_id: assignee_id || payload.assignee_id,
              ...payload,
            },
          });

          // Nếu có phân công KTV kèm theo
          if (assignee_id) {
            await con.query(
              `INSERT INTO task_assigns (task_id, user_id) 
               VALUES ($1, $2) 
               ON CONFLICT (task_id, user_id) DO UPDATE SET deleted_at = NULL`,
              [task_id, assignee_id]
            );
          }

          serverVersion = actionResult?.version || (base_version ? base_version + 1 : 2);
        }

        // --- Hành động 3: NỘP PHIẾU KIỂM TRA CHECKLIST (SUBMIT_CHECKLIST) ---
        else if (action_type === "SUBMIT_CHECKLIST") {
          const { assetId, checklistId, results: checklistResults } = payload;
          actionResult = await Inspection.submitRun({
            assetId,
            checklistId,
            inspectorId: userId,
            results: checklistResults || [],
          });
          serverVersion = 1;
        }

        // 3. Lưu log đồng bộ thành công vào offline_sync_logs
        await con.query(
          `INSERT INTO offline_sync_logs (user_id, idempotency_key, action_type, payload, base_version, server_version, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'APPLIED')`,
          [userId, idempotency_key, action_type, JSON.stringify(payload), base_version || 1, serverVersion]
        );

        results.push({
          idempotency_key,
          status: "APPLIED",
          temp_id: payload?.temp_id,
          data: actionResult,
        });

      } catch (err) {
        console.error(`[Sync] Lỗi thực thi action [${action_type}]:`, err.message);
        results.push({
          idempotency_key,
          status: "FAILED",
          error: err.message,
        });
      }
    }

    return results;
  }
}

export default Sync;
