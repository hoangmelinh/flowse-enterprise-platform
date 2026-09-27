import con from "../config/connect.js";
import WorkflowEngine from "../core/WorkflowEngine.js";

class Sync {
  /**
   * Xử lý batch actions gửi lên từ Mobile sau khi có mạng trở lại
   */
  static async processBatchSync(userId, actions = []) {
    const results = [];

    for (const act of actions) {
      const { idempotency_key, action_type, payload, base_version } = act;

      // 1. Kiểm tra idempotency: Nếu action này đã xử lý trước đó rồi thì bỏ qua
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

        if (action_type === "WORKFLOW_TRANSITION") {
          const { task_id, to_state_id, note } = payload;

          // Kiểm tra optimistic lock version
          const taskRes = await con.query(`SELECT version FROM tasks WHERE task_id = $1`, [task_id]);
          if (taskRes.rows.length > 0 && base_version && taskRes.rows[0].version !== base_version) {
            // Xung đột phiên bản
            await con.query(
              `INSERT INTO offline_sync_logs (user_id, idempotency_key, action_type, payload, base_version, server_version, status, conflict_detail)
               VALUES ($1, $2, $3, $4, $5, $6, 'CONFLICT', $7)`,
              [userId, idempotency_key, action_type, JSON.stringify(payload), base_version, taskRes.rows[0].version, "Task has been updated by another user."]
            );

            results.push({
              idempotency_key,
              status: "CONFLICT",
              message: "Bản ghi đã được người khác chỉnh sửa trên máy chủ.",
            });
            continue;
          }

          // Thực hiện transition
          actionResult = await WorkflowEngine.executeTransition({
            taskId: task_id,
            toStateId: to_state_id,
            user: { user_id: userId, role_name: "member" },
            note: note || "Offline sync action",
          });
        }

        // Lưu log đồng bộ thành công
        await con.query(
          `INSERT INTO offline_sync_logs (user_id, idempotency_key, action_type, payload, base_version, server_version, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'APPLIED')`,
          [userId, idempotency_key, action_type, JSON.stringify(payload), base_version || 1, actionResult?.version || 1]
        );

        results.push({
          idempotency_key,
          status: "APPLIED",
          data: actionResult,
        });
      } catch (err) {
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
