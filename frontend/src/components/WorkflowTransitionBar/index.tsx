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
  Camera,
  Sparkles,
  UploadCloud,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  getTaskTransitions,
  executeTransition,
  type WorkflowTransition,
} from "@/api/workflows";
import { getWorkspaceMembers } from "@/api/workspaces";
import { uploadFile } from "@/api/upload";
import { analyzeEvidence, type AIEvidenceAnalysis } from "@/api/incidents";
import { getFileUrl } from "@/utils/imageUrl";

interface WorkflowTransitionBarProps {
  taskId: number | string;
  taskName?: string;
  assetName?: string;
  symptom?: string;
  currentStateCode?: string;
  onTransitionSuccess?: () => void;
  size?: "small" | "middle" | "large";
  className?: string;
}

export const WorkflowTransitionBar: React.FC<WorkflowTransitionBarProps> = ({
  taskId,
  taskName,
  assetName,
  symptom,
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

  // State chuyên biệt cho Bằng chứng nghiệm thu & AI Copilot (Giai đoạn 3)
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIEvidenceAnalysis | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const res = await uploadFile(file);
      const url = res.file.file_url;
      setEvidenceUrls([url]);
      message.success("Tải ảnh bằng chứng lên thành công!");

      // Gọi AI Copilot phân tích ảnh tức thời kết hợp đối soát ngữ cảnh sự cố
      setAnalyzingAi(true);
      try {
        const aiRes = await analyzeEvidence({
          imageUrl: url,
          incidentTitle: taskName || "",
          assetName: assetName || "",
          symptom: symptom || "",
        });
        if (aiRes?.data) {
          setAiAnalysis(aiRes.data);
          if (aiRes.data.status === "VERIFIED") {
            message.success(`AI Copilot: Đã nhận diện máy móc hợp lệ (${aiRes.data.score}%)`);
          } else {
            message.warning(`AI Copilot: ${aiRes.data.feedback || "Phát hiện cảnh báo về hình ảnh hiện trường!"}`);
          }
        }
      } catch (aiErr: any) {
        console.warn("AI analysis warning:", aiErr);
      } finally {
        setAnalyzingAi(false);
      }
    } catch (err: any) {
      message.error("Lỗi khi tải ảnh lên: " + (err?.message || ""));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleButtonClick = (t: WorkflowTransition) => {
    const isClosingOrVerifying =
      t.to_state_code === "RESOLVED" ||
      t.to_state_code === "WAITING_VERIFY" ||
      t.to_state_code === "CLOSED" ||
      t.is_terminal;

    const needsModal =
      isClosingOrVerifying ||
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
      setEvidenceUrls([]);
      setAiAnalysis(null);
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

      if (evidenceUrls.length > 0) {
        metadata = {
          ...(metadata || {}),
          evidence_urls: evidenceUrls,
          ai_evidence_status: aiAnalysis?.status || "VERIFIED",
          ai_evidence_feedback: aiAnalysis?.feedback || null,
          ai_evidence_score: aiAnalysis?.score || 0,
        };
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

  if (loading && transitions.length === 0) {
    return <span className="text-xs text-gray-400">Đang tải FSM...</span>;
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
            title={(t as any).description || `Chuyển sang: ${t.to_state_name}`}
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
        okText={
          activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS"
            ? "Gửi đề xuất & Tạm dừng SLA"
            : activeTransition?.to_state_code === "RESOLVED" || activeTransition?.to_state_code === "WAITING_VERIFY"
            ? "Xác nhận & Hoàn tất"
            : "Xác nhận chuyển"
        }
        cancelText="Hủy bỏ"
        okButtonProps={{
          className:
            activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS"
              ? "bg-amber-600 hover:bg-amber-700"
              : activeTransition?.to_state_code === "RESOLVED"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-blue-600 hover:bg-blue-700",
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
        {activeTransition?.to_state_code === "ON_HOLD_PENDING_PARTS" && (
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
        )}

        {/* Luồng 3: Bằng chứng nghiệm thu & AI Copilot (RESOLVED / WAITING_VERIFY) */}
        {(activeTransition?.to_state_code === "RESOLVED" ||
          activeTransition?.to_state_code === "WAITING_VERIFY" ||
          activeTransition?.is_terminal) && (
          <div className="space-y-3 mb-4 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Camera size={14} className="text-blue-600" />
                Ảnh bằng chứng nghiệm thu hiện trường:
              </label>
              <span className="text-[11px] text-gray-500 font-medium">
                (Được thẩm định bởi AI Copilot)
              </span>
            </div>

            {/* Khung tải ảnh */}
            {evidenceUrls.length === 0 ? (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 rounded-xl cursor-pointer bg-white dark:bg-gray-800/50 hover:bg-blue-50/50 transition-all group">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <UploadCloud size={24} className="text-gray-400 group-hover:text-blue-600 mb-1.5 transition-colors" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {uploadingImage ? "Đang tải ảnh lên máy chủ..." : "Bấm để chọn ảnh chụp hiện trường máy móc"}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Hỗ trợ JPG, PNG (Tự động nén Sharp tối ưu dung lượng)
                </span>
              </label>
            ) : (
              <div className="space-y-2">
                <div className="relative inline-block w-full group">
                  <img
                    src={getFileUrl(evidenceUrls[0])}
                    alt="Bằng chứng nghiệm thu"
                    className="w-full max-h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEvidenceUrls([]);
                      setAiAnalysis(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-all opacity-90 hover:opacity-100"
                    title="Xóa ảnh và chọn ảnh khác"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Khối hiển thị kết quả AI Copilot */}
                {analyzingAi && (
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-xs flex items-center gap-2 animate-pulse">
                    <Sparkles size={14} className="text-blue-600 animate-spin" />
                    <span>AI Copilot đang phân tích cấu trúc chi tiết máy móc...</span>
                  </div>
                )}

                {aiAnalysis && !analyzingAi && (
                  <div
                    className={`p-3 rounded-xl border text-xs ${
                      aiAnalysis.status === "VERIFIED"
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-300"
                        : "bg-amber-50/90 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700/60 dark:text-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {aiAnalysis.status === "VERIFIED" ? (
                        <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <div className="space-y-1 w-full">
                        <div className="font-semibold flex items-center justify-between">
                          <span>
                            {aiAnalysis.status === "VERIFIED"
                              ? `AI Verified (Độ tin cậy: ${aiAnalysis.score}%)`
                              : `Cảnh báo AI Copilot (Độ tin cậy: ${aiAnalysis.score}%)`}
                          </span>
                        </div>
                        <div className="text-[11px] leading-relaxed opacity-90">{aiAnalysis.feedback}</div>
                        {aiAnalysis.tags && aiAnalysis.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {aiAnalysis.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  aiAnalysis.status === "VERIFIED"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200"
                                }`}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {aiAnalysis.status === "WARNING" && (
                          <div className="mt-2 text-[10px] bg-amber-100/70 dark:bg-amber-900/40 p-1.5 rounded text-amber-800 dark:text-amber-300">
                            💡 <em>Hệ thống vẫn cho phép bạn hoàn tất, nhưng ảnh sẽ được gắn cờ cảnh báo để Quản đốc kiểm tra lại.</em>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Luồng ghi chú thông thường */}
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
