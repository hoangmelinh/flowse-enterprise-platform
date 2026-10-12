import React, { useEffect, useState, useCallback } from "react";
import { Button, Modal, Input, Select, message, Tooltip, Space } from "antd";
import {
  ArrowRight,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  XCircle,
  Send,
  UserCheck,
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
  }, [fetchTransitions, currentStateCode]);

  useEffect(() => {
    getWorkspaceMembers(1)
      .then((res: any) => {
        if (Array.isArray(res)) {
          setMembers(res);
        } else if (res?.data && Array.isArray(res.data)) {
          setMembers(res.data);
        }
      })
      .catch(() => {
        setMembers([
          { user_id: 2, name: "Trần Văn Bình (KTV Cơ Khí)" },
          { user_id: 3, name: "Lê Hoàng Nam (KTV Điện)" },
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
      setModalOpen(true);
    } else {
      doExecute(t);
    }
  };

  const doExecute = async (t: WorkflowTransition, customNote?: string, assigneeId?: number | null) => {
    try {
      setSubmitting(true);
      const targetAssignee = assigneeId !== undefined ? assigneeId : selectedAssigneeId;
      await executeTransition(taskId, {
        toStateId: t.to_state_id,
        note: customNote || note,
        metadata: targetAssignee ? { assignee_id: targetAssignee } : undefined,
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
        return <PauseCircle size={14} className="mr-1" />;
      case "WAITING_VERIFY":
        return <Send size={14} className="mr-1" />;
      case "RESOLVED":
      case "DONE":
        return <CheckCircle2 size={14} className="mr-1" />;
      case "CANCELLED":
      case "REPORTED":
        return <XCircle size={14} className="mr-1 text-rose-500" />;
      default:
        return <ArrowRight size={14} className="mr-1" />;
    }
  };

  const getButtonType = (code: string): "primary" | "default" | "dashed" => {
    if (["RESOLVED", "DONE", "IN_PROGRESS"].includes(code)) return "primary";
    return "default";
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
        Thao tác FSM:
      </span>
      <Space size={6} wrap>
        {transitions.map((t) => (
          <Tooltip
            key={t.transition_id}
            title={`Chuyển trạng thái sang: ${t.to_state_name}`}
          >
            <Button
              size={size}
              type={getButtonType(t.to_state_code)}
              danger={t.to_state_code === "CANCELLED" || t.to_state_code === "REPORTED"}
              style={{
                backgroundColor:
                  t.to_state_color && getButtonType(t.to_state_code) === "primary"
                    ? t.to_state_color
                    : undefined,
                borderColor: t.to_state_color || undefined,
              }}
              className="inline-flex orientation-horizontal items-center font-medium shadow-xs"
              onClick={() => handleButtonClick(t)}
              loading={submitting && activeTransition?.transition_id === t.transition_id}
            >
              {getTransitionIcon(t.to_state_code)}
              {t.transition_name}
            </Button>
          </Tooltip>
        ))}
      </Space>

      <Modal
        title={
          <div className="flex orientation-horizontal items-center gap-2">
            <AlertCircle size={18} className="text-blue-600" />
            <span>Xác nhận: {activeTransition?.transition_name}</span>
          </div>
        }
        open={modalOpen}
        onOk={() => {
          if (activeTransition?.to_state_code === "ASSIGNED" && !selectedAssigneeId) {
            message.warning("Vui lòng chọn kỹ thuật viên để phân công!");
            return;
          }
          if (activeTransition?.to_state_code === "REPORTED" && !note.trim()) {
            message.warning("Vui lòng nhập lý do từ chối tiếp nhận!");
            return;
          }
          if (activeTransition) {
            doExecute(activeTransition, note, selectedAssigneeId);
          }
        }}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="Xác nhận chuyển"
        cancelText="Hủy bỏ"
      >
        <p className="text-sm text-gray-600 mb-3">
          Trạng thái sẽ được chuyển sang:{" "}
          <strong className="text-gray-900">{activeTransition?.to_state_name}</strong>
        </p>

        {activeTransition?.to_state_code === "ASSIGNED" && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Chọn Kỹ thuật viên phụ trách: <span className="text-red-500">*</span>
            </label>
            <Select
              className="w-full"
              placeholder="Chọn kỹ thuật viên tiếp nhận..."
              value={selectedAssigneeId}
              onChange={(val) => setSelectedAssigneeId(val)}
              options={members.map((m: any) => ({
                label: `${m.name || m.username || m.email} (${m.role_name || "Thành viên"})`,
                value: m.user_id,
              }))}
            />
          </div>
        )}

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
      </Modal>
    </div>
  );
};

export default WorkflowTransitionBar;
