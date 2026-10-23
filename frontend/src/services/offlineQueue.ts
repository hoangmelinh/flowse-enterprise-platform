import { beApi } from "@/api/callApi";
import { uploadOfflineEvidences } from "./offlineMedia";

export type OfflineActionType = "REPORT_INCIDENT" | "WORKFLOW_TRANSITION" | "SUBMIT_CHECKLIST";

export type OfflineActionStatus = "PENDING" | "SYNCING" | "CONFLICT" | "FAILED";

export interface OfflineAction {
  id: string; // Client local id
  idempotency_key: string; // UUID v4
  action_type: OfflineActionType;
  payload: any;
  base_version?: number;
  created_at: string;
  retry_count: number;
  status: OfflineActionStatus;
  error_message?: string;
  server_conflict_data?: any;
}

const STORAGE_KEY = "flowse_offline_actions_v1";
const MAX_QUEUE_SIZE = 50;
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 giờ theo ca kíp thực tế (tránh đè dữ liệu cũ quá hạn)

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function notifyQueueChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("flowse_offline_queue_changed"));
  }
}

/**
 * Đọc danh sách action đang lưu trong LocalStorage
 */
export function getOfflineQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: OfflineAction[] = JSON.parse(raw);
    const now = Date.now();
    // Lọc bỏ các thao tác quá 24h
    const valid = list.filter((item) => {
      const itemTime = new Date(item.created_at).getTime();
      return now - itemTime < MAX_AGE_MS;
    });
    if (valid.length !== list.length) {
      saveQueue(valid);
    }
    return valid;
  } catch (err) {
    console.error("[OfflineQueue] Lỗi đọc queue từ localStorage:", err);
    return [];
  }
}

function saveQueue(queue: OfflineAction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUE_SIZE)));
    notifyQueueChange();
  } catch (err) {
    console.error("[OfflineQueue] Lỗi lưu queue vào localStorage:", err);
  }
}

/**
 * Thêm một hành động vào hàng đợi ngoại tuyến
 */
export function enqueueAction(params: {
  action_type: OfflineActionType;
  payload: any;
  base_version?: number;
}): OfflineAction {
  const queue = getOfflineQueue();
  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const idempotency_key = generateUUID();

  const newAction: OfflineAction = {
    id,
    idempotency_key,
    action_type: params.action_type,
    payload: params.payload,
    base_version: params.base_version ?? 1,
    created_at: new Date().toISOString(),
    retry_count: 0,
    status: "PENDING",
  };

  queue.push(newAction);
  saveQueue(queue);
  console.log(`[OfflineQueue] Đã ghi nhận hành động ngoại tuyến [${params.action_type}]:`, newAction);
  return newAction;
}

/**
 * Xóa một hành động khỏi hàng đợi khi đã đồng bộ thành công
 */
export function removeAction(id: string) {
  const queue = getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);
  saveQueue(filtered);
}

/**
 * Cập nhật trạng thái của một hành động trong hàng đợi
 */
export function updateAction(id: string, updates: Partial<OfflineAction>) {
  const queue = getOfflineQueue();
  const updated = queue.map((item) => (item.id === id ? { ...item, ...updates } : item));
  saveQueue(updated);
}

/**
 * Xóa sạch toàn bộ hàng đợi
 */
export function clearOfflineQueue() {
  localStorage.removeItem(STORAGE_KEY);
  notifyQueueChange();
}

/**
 * Đẩy toàn bộ các hành động PENDING lên server qua endpoint POST /api/v1/sync/batch
 */
export async function syncBatchActions(): Promise<{
  success: boolean;
  appliedCount: number;
  conflicts: OfflineAction[];
  failedCount: number;
}> {
  const queue = getOfflineQueue();
  const pendingActions = queue.filter((a) => a.status === "PENDING" || a.status === "FAILED");

  if (pendingActions.length === 0) {
    return { success: true, appliedCount: 0, conflicts: [], failedCount: 0 };
  }

  // Đánh dấu sang SYNCING
  pendingActions.forEach((a) => updateAction(a.id, { status: "SYNCING" }));

  try {
    // 1. Tự động đẩy toàn bộ ảnh đính kèm từ IndexedDB lên server trước (nếu có)
    for (const a of pendingActions) {
      try {
        const uploadedUrls = await uploadOfflineEvidences(a.id);
        if (uploadedUrls.length > 0) {
          const currentUrls = a.payload?.evidence_urls || [];
          a.payload = {
            ...a.payload,
            evidence_urls: [...currentUrls, ...uploadedUrls],
          };
          updateAction(a.id, { payload: a.payload });
        }
      } catch (mediaErr) {
        console.warn(`[offlineQueue] Lỗi tải ảnh IndexedDB cho action ${a.id}:`, mediaErr);
      }
    }

    const payloadActions = pendingActions.map((a) => ({
      idempotency_key: a.idempotency_key,
      action_type: a.action_type,
      payload: a.payload,
      base_version: a.base_version,
      client_action_id: a.id,
    }));

    const response = await beApi.post("/sync/batch", { actions: payloadActions });
    const results = response.data?.data || [];

    let appliedCount = 0;
    let failedCount = 0;
    const conflicts: OfflineAction[] = [];

    for (const res of results) {
      const match = pendingActions.find((a) => a.idempotency_key === res.idempotency_key);
      if (!match) continue;

      if (res.status === "APPLIED" || res.status === "ALREADY_APPLIED") {
        removeAction(match.id);
        appliedCount++;
      } else if (res.status === "CONFLICT") {
        updateAction(match.id, {
          status: "CONFLICT",
          error_message: res.message || "Xung đột phiên bản dữ liệu.",
          server_conflict_data: res.server_record,
        });
        conflicts.push({
          ...match,
          status: "CONFLICT",
          server_conflict_data: res.server_record,
        });
      } else {
        updateAction(match.id, {
          status: "FAILED",
          retry_count: match.retry_count + 1,
          error_message: res.error || "Lỗi xử lý nghiệp vụ.",
        });
        failedCount++;
      }
    }

    notifyQueueChange();
    return {
      success: conflicts.length === 0 && failedCount === 0,
      appliedCount,
      conflicts,
      failedCount,
    };
  } catch (err: any) {
    console.error("[OfflineQueue] Lỗi gọi API /sync/batch:", err);
    pendingActions.forEach((a) =>
      updateAction(a.id, {
        status: "FAILED",
        retry_count: a.retry_count + 1,
        error_message: err?.message || "Không thể kết nối máy chủ.",
      })
    );
    notifyQueueChange();
    return {
      success: false,
      appliedCount: 0,
      conflicts: [],
      failedCount: pendingActions.length,
    };
  }
}

/**
 * Ghi đè bắt buộc (Force apply) sau khi giải quyết xung đột 409
 */
export async function forceApplyAction(actionId: string): Promise<boolean> {
  const queue = getOfflineQueue();
  const action = queue.find((a) => a.id === actionId);
  if (!action) return false;

  try {
    const response = await beApi.post("/sync/batch", {
      actions: [
        {
          idempotency_key: action.idempotency_key,
          action_type: action.action_type,
          payload: action.payload,
          base_version: action.base_version,
          force_apply: true,
        },
      ],
    });

    const res = response.data?.data?.[0];
    if (res?.status === "APPLIED" || res?.status === "ALREADY_APPLIED") {
      removeAction(action.id);
      return true;
    }
    return false;
  } catch (err) {
    console.error("[OfflineQueue] Lỗi force apply action:", err);
    return false;
  }
}
