import { useState, useEffect, useCallback } from "react";
import {
  getOfflineQueue,
  syncBatchActions,
  clearOfflineQueue,
  type OfflineAction,
} from "@/services/offlineQueue";
import { message } from "antd";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<OfflineAction[]>(() => getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshQueue = useCallback(() => {
    setQueue(getOfflineQueue());
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await syncBatchActions();
      refreshQueue();
      if (res.appliedCount > 0) {
        message.success(`Đã đồng bộ thành công ${res.appliedCount} thao tác ngoại tuyến lên máy chủ!`);
      }
      if (res.conflicts.length > 0) {
        message.warning(`Phát hiện ${res.conflicts.length} thao tác xung đột (409 Conflict). Vui lòng xử lý!`);
      }
    } catch (err) {
      console.error("[useOnlineStatus] Lỗi đồng bộ:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("[useOnlineStatus] Đã kết nối mạng trở lại. Bắt đầu tự động đồng bộ...");
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.warn("[useOnlineStatus] Mất kết nối mạng! Ứng dụng chuyển sang chế độ Ngoại tuyến (Offline).");
    };

    const handleQueueChange = () => {
      refreshQueue();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("flowse_offline_queue_changed", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("flowse_offline_queue_changed", handleQueueChange);
    };
  }, [syncNow, refreshQueue]);

  const pendingCount = queue.filter(
    (a) => a.status === "PENDING" || a.status === "SYNCING" || a.status === "FAILED"
  ).length;

  const conflicts = queue.filter((a) => a.status === "CONFLICT");

  return {
    isOnline,
    pendingCount,
    isSyncing,
    conflicts,
    queue,
    syncNow,
    clearQueue: clearOfflineQueue,
  };
}
