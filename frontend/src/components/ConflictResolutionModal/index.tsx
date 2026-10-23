import React, { useState } from "react";
import { Modal, Button, Tag, message } from "antd";
import { AlertTriangle, CheckCircle2, RotateCcw, Server, Smartphone } from "lucide-react";
import { forceApplyAction, removeAction, type OfflineAction } from "@/services/offlineQueue";

interface ConflictResolutionModalProps {
  conflicts: OfflineAction[];
  onResolved: () => void;
  open?: boolean;
  onClose?: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflicts,
  onResolved,
  open,
  onClose,
}) => {
  const currentIndex = 0;
  const [submitting, setSubmitting] = useState(false);

  if (!conflicts || conflicts.length === 0) return null;

  const currentConflict = conflicts[currentIndex] || conflicts[0];
  const total = conflicts.length;

  const handleForceApply = async () => {
    setSubmitting(true);
    try {
      const ok = await forceApplyAction(currentConflict.id);
      if (ok) {
        message.success("Đã ép ghi đè dữ liệu của bạn lên máy chủ thành công!");
        onResolved();
      } else {
        message.error("Ghi đè thất bại. Vui lòng thử lại!");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    removeAction(currentConflict.id);
    message.info("Đã hủy bỏ thao tác ngoại tuyến và giữ dữ liệu mới nhất từ máy chủ.");
    onResolved();
  };

  return (
    <Modal
      open={open !== undefined ? open : conflicts.length > 0}
      onCancel={onClose}
      footer={null}
      closable={!!onClose}
      width={680}
      zIndex={3500}
      title={
        <div className="flex items-center gap-2 text-rose-600">
          <AlertTriangle size={20} />
          <span className="font-bold text-base text-gray-900 dark:text-gray-100">
            Phát hiện Xung đột Dữ liệu Ngoại tuyến (409 Conflict)
          </span>
          {total > 1 && (
            <Tag color="orange" className="ml-auto">
              {currentIndex + 1} / {total} xung đột
            </Tag>
          )}
        </div>
      }
    >
      <div className="space-y-4 pt-2">
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Trong lúc bạn bị mất mạng (Offline), bản ghi này đã được một người dùng khác cập nhật trên máy chủ. Vui lòng đối chiếu và lựa chọn hướng giải quyết:
        </p>

        {/* Bảng so sánh 2 cột */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cột Trái: Dữ liệu của KTV lúc Offline */}
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Smartphone size={14} /> Thao tác của bạn (Offline)
              </span>
              <Tag color="blue" className="m-0 text-[10px]">
                v{currentConflict.base_version || 1}
              </Tag>
            </div>

            <div className="text-xs space-y-1.5 pt-1 text-gray-700 dark:text-gray-300">
              <div>
                <span className="text-gray-400">Loại hành động:</span>{" "}
                <strong>{currentConflict.action_type}</strong>
              </div>
              {currentConflict.payload?.to_state_id && (
                <div>
                  <span className="text-gray-400">Yêu cầu chuyển sang:</span>{" "}
                  <Tag color="purple">State #{currentConflict.payload.to_state_id}</Tag>
                </div>
              )}
              {currentConflict.payload?.note && (
                <div>
                  <span className="text-gray-400">Ghi chú của bạn:</span>
                  <p className="p-1.5 bg-white dark:bg-gray-900 rounded border border-blue-100 dark:border-blue-900/40 text-[11px] mt-0.5">
                    {currentConflict.payload.note}
                  </p>
                </div>
              )}
              <div className="text-[11px] text-gray-400 pt-1">
                Thời điểm ghi nhận: {new Date(currentConflict.created_at).toLocaleTimeString("vi-VN")}
              </div>
            </div>
          </div>

          {/* Cột Phải: Dữ liệu hiện tại trên Máy chủ */}
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Server size={14} /> Hiện tại trên Máy chủ
              </span>
              <Tag color="rose" className="m-0 text-[10px]">
                v{currentConflict.server_conflict_data?.version || 2}
              </Tag>
            </div>

            <div className="text-xs space-y-1.5 pt-1 text-gray-700 dark:text-gray-300">
              <div>
                <span className="text-gray-400">Trạng thái hiện tại:</span>{" "}
                <Tag color="green">
                  {currentConflict.server_conflict_data?.current_state_name || "Đã cập nhật"}
                </Tag>
              </div>
              <div>
                <span className="text-gray-400">Tiêu đề công việc:</span>{" "}
                <strong>{currentConflict.server_conflict_data?.name || "N/A"}</strong>
              </div>
              <div className="p-2 bg-white dark:bg-gray-900 rounded border border-rose-100 dark:border-rose-900/40 text-[11px] text-rose-600 mt-2">
                {currentConflict.error_message || "Dữ liệu máy chủ đã thay đổi trước khi bạn kết nối lại."}
              </div>
            </div>
          </div>
        </div>

        {/* 2 Nút hành động */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
          <Button
            danger
            icon={<RotateCcw size={14} />}
            onClick={handleDiscard}
            disabled={submitting}
          >
            Hủy bỏ &amp; Lấy bản mới từ máy chủ
          </Button>

          <Button
            type="primary"
            className="bg-blue-600 hover:bg-blue-700"
            icon={<CheckCircle2 size={14} />}
            onClick={handleForceApply}
            loading={submitting}
          >
            Ghi đè bằng dữ liệu của tôi
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConflictResolutionModal;
