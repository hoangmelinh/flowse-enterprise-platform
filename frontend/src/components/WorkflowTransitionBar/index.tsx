import React, { useEffect, useState, useCallback } from "react";
import { Button, Modal, Input, Select, message, Tooltip, Space, InputNumber } from "antd";
import {
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  XCircle,
  Send,
  UserCheck,
  Wrench,
  ShieldAlert,
} from "lucide-react";
import {
  getTaskTransitions,
  executeTransition,
  type WorkflowTransition,
} from "@/api/workflows";
import { getWorkspaceMembers } from "@/api/workspaces";

interface WorkflowTransitionBarProps {
  taskId: number | string;
  currentStateCode?: string;
  onTransitionSuccess?: () => void;
  size?: "small" | "middle" | "large";
  className?: string;
}

export const WorkflowTransitionBar: React.FC<WorkflowTransitionBarProps> = ({
  taskId,
  currentStateCode,
  onTransitionSuccess,
  size = "middle",
  className = "",
}) => {
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTransition, setActiveTransition] = useState<WorkflowTransition | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [note, setNote] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | null>(null);
  const [members, setMembers] = useState<{ user_id: number; name: string; email?: string; role_name?: string }[]>([]);

  // State chuyên biệt cho yêu cầu cấp linh kiện
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");

  const fetchTransitions = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const res = await getTaskTransitions(taskId);
      if (res?.data) {
        setTransitions(res.data);
      }
    } catch (err: any) {
      console.warn("Could not fetch workflow transitions:", err);
      setTransitions([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTransitions();
    setModalOpen(false);
    setActiveTransition(null);
  }, [fetchTransitions, currentStateCode, taskId]);

  useEffect(() => {
    getWorkspaceMembers(1)
      .then((res: any) => {
        if (Array.isArray(res) && res.length > 0) {
          setMembers(res);
        } else if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setMembers(res.data);
        } else {
          setMembers([
            { user_id: 2, name: "Trần Văn Bình", role_name: "KTV Cơ Khí" },
            { user_id: 3, name: "Lê Hoàng Nam", role_name: "KTV Điện" },
            { user_id: 1, name: "nguyen van hien vinh", role_name: "Quản đốc" },
          ]);
        }
      })
      .catch(() => {
        setMembers([
          { user_id: 2, name: "Trần Văn Bình", role_name: "KTV Cơ Khí" },
          { user_id: 3, name: "Lê Hoàng Nam", role_name: "KTV Điện" },
          { user_id: 1, name: "nguyen van hien vinh", role_name: "Quản đốc" },
        ]);
      });
  }, []);

  const handleButtonClick = (t: WorkflowTransition) => {
    const needsModal =
      t.is_terminal ||
      t.to_state_code === "CANCELLED" ||
      t.to_state_code === "ON_HOLD_PENDING_PARTS" ||
      t.to_state_code === "ASSIGNED" ||
      t.to_state_code === "REPORTED" ||
      t.requires_approval;

    if (needsModal) {
      setActiveTransition(t);
      setNote("");
      setSelectedAssigneeId(null);
      setPartName("");
      setQuantity(1);
      setReason("");
      setModalOpen(true);
    } else {
      doExecute(t);
    }
  };

  const doExecute = async (t: WorkflowTransition) => {
    try {
      setSubmitting(true);
      let metadata: any = undefined;
      let finalNote = note.trim();

      if (t.to_state_code === "ASSIGNED" && selectedAssigneeId) {
        metadata = { assignee_id: selectedAssigneeId };
      } else if (t.to_state_code === "ON_HOLD_PENDING_PARTS") {
        metadata = {
          partName: partName.trim(),
          quantity: quantity || 1,
          reason: reason.trim(),
        };
        finalNote = `Đề xuất linh kiện: ${partName.trim()} (SL: ${quantity || 1}). Lý do: ${reason.trim()}`;
      }

      await executeTransition(taskId, {
        toStateId: t.to_state_id,
        note: finalNote,
        metadata,
      });
      message.success(`Đã chuyển trạng thái sang "${t.to_state_name}"`);
      setModalOpen(false);
      fetchTransitions();
      onTransitionSuccess?.();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Không thể thực hiện bước chuyển trạng thái");
    } finally {
      setSubmitting(false);
    }
  };

  const getTransitionIcon = (code: string) => {
    switch (code) {
      case "ASSIGNED":
        return <UserCheck size={14} className="mr-1" />;
      case "IN_PROGRESS":
        return <PlayCircle size={14} className="mr-1" />;
      case "ON_HOLD_PENDING_PARTS":
        return <PauseCircle size={14} className="mr-1 text-amber-500" />;
      case "WAITING_VERIFY":
        return <Send size={14} className="mr-1" />;
      case "RESOLVED":
      case "DONE":
        return <CheckCircle2 size={14} className="mr-1 text-emerald-500" />;
      case "CANCELLED":
      case "REPORTED":
        return <XCircle size={14} className="mr-1 text-rose-500" />;
      default:
        return <ArrowRight size={14} className="mr-1" />;
    }
  };

  const getButtonVariant = (code: string) => {
    switch (code) {
      case "ASSIGNED":
        return { type: "primary" as const, className: "bg-blue-600 hover:bg-blue-700 text-white font-medium" };
      case "IN_PROGRESS":
        return { type: "primary" as const, className: "bg-indigo-600 hover:bg-indigo-700 text-white font-medium" };
      case "ON_HOLD_PENDING_PARTS":
        return { type: "default" as const, className: "border-amber-400 text-amber-700 hover:border-amber-500 hover:text-amber-800 bg-amber-50/50" };
      case "RESOLVED":
      case "DONE":
        return { type: "primary" as const, className: "bg-emerald-600 hover:bg-emerald-700 text-white font-medium" };
      case "CANCELLED":
        return { type: "default" as const, danger: true, className: "border-red-300 text-red-600 hover:border-red-400" };
      default:
        return { type: "default" as const, className: "" };
    }
  };

  if (!transitions || transitions.length === 0) {
    return null;
  }

  return (
    <div className={`workflow-transition-bar inline-flex items-center gap-1.5 ${className}`}>
      <Space size={6} wrap>
        <span className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider mr-1 select-none">
          Thao tác FSM:
        </span>
        {transitions.map((t) => (
          <Tooltip
            key={t.transition_id}
            title={t.description || `Chuyển sang: ${t.to_state_name}`}
            zIndex={99999}
          >
            <Button
              {...getButtonVariant(t.to_state_code)}
              size={size}
              onClick={() => handleButtonClick(t)}
              loading={submitting && activeTransition?.transition_id === t.transition_id}
            >
              {getTransitionIcon(t.to_state_code)}
              {t.transition_name}
            </Button>
          </Tooltip>
        ))}
      </Space>

      {/* Modal xác nhận chuyển trạng thái: zIndex 2500 để luôn hiển thị phía trước TaskDetailModal (z-[1200]) */}
      <Modal
        zIndex={2500}
        title={
          <div className="flex items-center gap-2">
            {activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS" ? (
              <Wrench size={18} className="text-amber-600" />
            ) : (
              <AlertCircle size={18} className="text-blue-600" />
            )}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS"
                ? "Yêu cầu cấp phát linh kiện / vật tư thay thế"
                : `Xác nhận: ${activeTransition?.transition_name}`}
            </span>
          </div>
        }
        open={modalOpen}
        onOk={() => {
          if (activeTransition?.to_state_code === "ASSIGNED" && !selectedAssigneeId) {
            message.warning("Vui lòng chọn kỹ thuật viên để phân công!");
            return;
          }
          if (activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS") {
            if (!partName.trim()) {
              message.warning("Vui lòng nhập tên linh kiện/vật tư cần thay!");
              return;
            }
            if (!reason.trim()) {
              message.warning("Vui lòng nhập lý do cần thay thế linh kiện!");
              return;
            }
          }
          if (activeTransition?.to_state_code === "REPORTED" && !note.trim()) {
            message.warning("Vui lòng nhập lý do từ chối tiếp nhận!");
            return;
          }
          if (activeTransition) {
            doExecute(activeTransition);
          }
        }}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS" ? "Gửi đề xuất & Tạm dừng SLA" : "Xác nhận chuyển"}
        cancelText="Hủy bỏ"
        okButtonProps={{
          className: activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700",
        }}
      >
        <p className="text-sm text-gray-600 mb-3">
          Trạng thái sẽ được chuyển sang:{" "}
          <strong className="text-gray-900 dark:text-gray-100">{activeTransition?.to_state_name}</strong>
        </p>

        {/* Luồng 1: Phân công kỹ thuật viên (ASSIGNED) */}
        {activeTransition?.to_state_code === "ASSIGNED" && (
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              Chọn Kỹ thuật viên phụ trách: <span className="text-red-500">*</span>
            </label>
            <Select
              className="w-full"
              placeholder="Chọn kỹ thuật viên tiếp nhận..."
              value={selectedAssigneeId}
              onChange={(val) => setSelectedAssigneeId(val)}
              dropdownStyle={{ zIndex: 2600 }}
              options={members.map((m: any) => ({
                label: `${m.name || m.username || m.email} (${m.role_name || "Kỹ thuật viên"})`,
                value: m.user_id,
              }))}
            />
          </div>
        )}

        {/* Luồng 2: Yêu cầu cấp linh kiện vật tư (ON_HOLD_PENDING_PARTS) */}
        {activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS" ? (
          <div className="space-y-3 mb-3 bg-amber-50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
            <div className="text-xs text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                Khi gửi yêu cầu, phiếu đề xuất sẽ được chuyển thẳng đến <strong>Trung tâm Phê duyệt</strong> và <strong>Đồng hồ SLA sẽ tự động đóng băng (PAUSED)</strong> để bảo vệ KPI cho bạn.
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Tên linh kiện / Vật tư cần thay: <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: Vòng bi trục chính SKF-6204, Dầu thủy lực ISO VG 46..."
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Số lượng: <span className="text-red-500">*</span>
                </label>
                <InputNumber
                  min={1}
                  max={100}
                  className="w-full"
                  value={quantity}
                  onChange={(val) => setQuantity(val || 1)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Lý do &amp; Tình trạng hỏng hóc: <span className="text-red-500">*</span>
              </label>
              <Input.TextArea
                rows={2}
                placeholder="Mô tả linh kiện bị rạn nứt, cháy cuộn dây, mòn quá giới hạn an toàn..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>
        ) : (
          /* Luồng ghi chú thông thường */
          <div className="mb-2">
            <label className="text-xs font-semibold text-gray-500 block mb-1">
              {activeTransition?.to_state_code === "REPORTED"
                ? "Lý do từ chối tiếp nhận (Audit Trail): *"
                : "Ghi chú / Biên bản thực hiện (Audit Trail):"}
            </label>
            <Input.TextArea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                activeTransition?.to_state_code === "REPORTED"
                  ? "Nhập lý do KTV từ chối tiếp nhận (bận ca máy khác, không đủ dụng cụ...)"
                  : "Nhập lý do, tóm tắt kết quả hoặc ghi chú chỉ đạo..."
              }
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkflowTransitionBar;
