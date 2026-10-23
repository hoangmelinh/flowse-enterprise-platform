import React, { useState } from "react";
import { Button, Tag, Drawer, List, Popconfirm, Tooltip, Empty } from "antd";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  AlertTriangle,
  Clock,
  Trash2,
  Layers,
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import ConflictResolutionModal from "@/components/ConflictResolutionModal";

export const OfflineSyncBanner: React.FC = () => {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    conflicts,
    queue,
    syncNow,
    clearQueue,
  } = useOnlineStatus();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);

  React.useEffect(() => {
    if (conflicts.length > 0) {
      setConflictModalOpen(true);
    }
  }, [conflicts.length]);

  // Không hiển thị nếu đang online, không có pending và không có conflict
  if (isOnline && pendingCount === 0 && conflicts.length === 0) {
    return null;
  }

  return (
    <>
      {/* ─── Sticky Top Status Banner ─── */}
      <div
        className={`sticky top-0 z-[2000] px-4 py-2 flex items-center justify-between text-xs transition-colors shadow-sm ${
          !isOnline
            ? "bg-amber-500 text-white font-medium"
            : conflicts.length > 0
            ? "bg-rose-600 text-white font-medium"
            : "bg-blue-600 text-white font-medium"
        }`}
      >
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <>
              <WifiOff size={16} className="animate-pulse shrink-0" />
              <span>
                <strong>Chế độ Ngoại tuyến (Offline):</strong> Bạn đang mất kết nối mạng. Các thao tác (báo sự cố, chuyển trạng thái FSM) sẽ được lưu an toàn trong máy.
              </span>
            </>
          ) : conflicts.length > 0 ? (
            <>
              <AlertTriangle size={16} className="animate-bounce shrink-0" />
              <span>
                <strong>Xung đột Dữ liệu (409 Conflict):</strong> Có {conflicts.length} thao tác ngoại tuyến bị người khác cập nhật trước trên máy chủ.
              </span>
            </>
          ) : (
            <>
              <Wifi size={16} className="shrink-0" />
              <span>
                <strong>Đã kết nối mạng:</strong> Có {pendingCount} thao tác ngoại tuyến đang chờ đồng bộ lên máy chủ.
              </span>
            </>
          )}

          {pendingCount > 0 && (
            <Tag
              color={!isOnline ? "default" : "cyan"}
              className="cursor-pointer ml-1 text-[11px] font-bold border-none"
              onClick={() => setDrawerOpen(true)}
            >
              {pendingCount} chờ đồng bộ
            </Tag>
          )}
        </div>

        <div className="flex items-center gap-2">
          {conflicts.length > 0 && (
            <Button
              size="small"
              className="bg-white text-rose-600 border-none font-bold text-xs hover:bg-rose-50"
              onClick={() => setConflictModalOpen(true)}
            >
              Xem &amp; Xử lý ({conflicts.length})
            </Button>
          )}

          {isOnline && pendingCount > 0 && (
            <Button
              size="small"
              icon={<RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />}
              className="bg-white text-blue-600 border-none font-bold text-xs hover:bg-blue-50"
              loading={isSyncing}
              onClick={syncNow}
            >
              Đồng bộ ngay
            </Button>
          )}

          <Tooltip title="Xem chi tiết danh sách hàng đợi ngoại tuyến">
            <Button
              size="small"
              type="text"
              icon={<Layers size={14} className="text-white" />}
              onClick={() => setDrawerOpen(true)}
            />
          </Tooltip>
        </div>
      </div>

      {/* ─── Drawer Chi Tiết Hàng Đợi Ngoại Tuyến ─── */}
      <Drawer
        title={
          <div className="flex items-center justify-between pr-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
              <Layers size={16} className="text-blue-600" />
              <span>Hàng đợi Ngoại tuyến (Offline Queue)</span>
              <Tag color="blue">{queue.length} tác vụ</Tag>
            </div>
            {queue.length > 0 && (
              <Popconfirm
                title="Xóa toàn bộ hàng đợi ngoại tuyến?"
                description="Các thao tác chưa đồng bộ sẽ bị mất vĩnh viễn."
                onConfirm={clearQueue}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<Trash2 size={13} />}>
                  Xóa tất cả
                </Button>
              </Popconfirm>
            )}
          </div>
        }
        placement="right"
        width={420}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {queue.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có thao tác nào trong hàng đợi ngoại tuyến."
          />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={queue}
            renderItem={(item) => (
              <List.Item
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40 p-3 rounded-lg border-b border-gray-100 dark:border-gray-800 transition-colors"
              >
                <List.Item.Meta
                  title={
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {item.action_type === "REPORT_INCIDENT"
                          ? "🚨 Báo cáo Sự Cố"
                          : item.action_type === "WORKFLOW_TRANSITION"
                          ? "🔄 Chuyển Quy Trình FSM"
                          : "📋 Phiếu Kiểm Tra"}
                      </span>
                      <Tag
                        color={
                          item.status === "PENDING"
                            ? "orange"
                            : item.status === "SYNCING"
                            ? "blue"
                            : item.status === "CONFLICT"
                            ? "red"
                            : "default"
                        }
                        className="text-[10px] m-0 font-mono"
                      >
                        {item.status}
                      </Tag>
                    </div>
                  }
                  description={
                    <div className="text-[11px] text-gray-500 space-y-1 mt-1">
                      {item.payload?.title && <div>Tiêu đề: {item.payload.title}</div>}
                      {item.payload?.to_state_id && <div>State đích: #{item.payload.to_state_id}</div>}
                      {item.payload?.note && <div>Ghi chú: {item.payload.note}</div>}
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock size={10} />
                        {new Date(item.created_at).toLocaleTimeString("vi-VN")} - ID: {item.id.slice(0, 10)}...
                      </div>
                      {item.error_message && (
                        <div className="text-rose-500 text-[10px]">
                          Lỗi: {item.error_message}
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>

      {/* ─── Hộp Thoại Xử Lý Xung Đột 409 ─── */}
      <ConflictResolutionModal
        conflicts={conflicts}
        open={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        onResolved={() => {
          if (conflicts.length <= 1) {
            setConflictModalOpen(false);
          }
        }}
      />
    </>
  );
};

export default OfflineSyncBanner;
