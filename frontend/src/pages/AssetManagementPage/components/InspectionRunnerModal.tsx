import React, { useEffect, useState } from "react";
import { Modal, Button, Radio, Input, message, Spin, Tag, Alert } from "antd";
import { CheckCircle2, XCircle, AlertTriangle, ClipboardCheck, Camera } from "lucide-react";
import {
  getAssetChecklist,
  submitInspection,
  type Checklist,
  type InspectionSubmissionResult,
} from "@/api/inspections";
import { type Asset } from "@/api/assets";

interface InspectionRunnerModalProps {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const InspectionRunnerModal: React.FC<InspectionRunnerModalProps> = ({
  open,
  asset,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [answers, setAnswers] = useState<
    Record<number, { isPassed: boolean; note: string; evidenceUrl: string }>
  >({});

  useEffect(() => {
    if (!open || !asset) return;

    const fetchChecklist = async () => {
      try {
        setLoading(true);
        const res = await getAssetChecklist(asset.asset_id);
        if (res?.data) {
          setChecklist(res.data);
          // Khởi tạo mặc định tất cả đều là PASS
          const initialAnswers: Record<number, { isPassed: boolean; note: string; evidenceUrl: string }> = {};
          (res.data.items || []).forEach((item) => {
            initialAnswers[item.item_id] = { isPassed: true, note: "", evidenceUrl: "" };
          });
          setAnswers(initialAnswers);
        }
      } catch (err: any) {
        message.error(err?.message || "Không thể tải checklist cho thiết bị này");
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, [open, asset]);

  const handleTogglePass = (itemId: number, isPassed: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        isPassed,
      },
    }));
  };

  const handleNoteChange = (itemId: number, note: string) => {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        note,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!asset || !checklist) return;

    // Kiểm tra nếu có câu FAIL mà chưa nhập ghi chú
    const items = checklist.items || [];
    for (const item of items) {
      const ans = answers[item.item_id];
      if (ans && !ans.isPassed && !ans.note.trim()) {
        message.warning(`Vui lòng nhập mô tả lỗi cho mục: "${item.question.slice(0, 40)}..."`);
        return;
      }
    }

    const payloadResults: InspectionSubmissionResult[] = items.map((item) => ({
      itemId: item.item_id,
      isPassed: answers[item.item_id]?.isPassed ?? true,
      note: answers[item.item_id]?.note || "",
      evidenceUrl: answers[item.item_id]?.evidenceUrl || "",
    }));

    try {
      setSubmitting(true);
      const res = await submitInspection({
        assetId: asset.asset_id,
        checklistId: checklist.checklist_id,
        results: payloadResults,
      });

      if (res?.data?.overallStatus === "FAIL") {
        Modal.warning({
          title: "Phát hiện lỗi kỹ thuật qua kiểm tra!",
          content: (
            <div>
              <p>
                Đã ghi nhận <strong>{res.data.failedCount} hạng mục KHÔNG ĐẠT</strong>.
              </p>
              <p className="text-red-600 font-semibold mt-2">
                🚨 Hệ thống đã TỰ ĐỘNG KHỞI TẠO Sự cố mới trên Incident Hub để điều phối kỹ thuật viên xử lý ngay lập tức!
              </p>
            </div>
          ),
        });
      } else {
        message.success("Toàn bộ các hạng mục kiểm tra đều ĐẠT CHUẨN (PASS)!");
      }

      onClose();
      onSuccess();
    } catch (err: any) {
      message.error(err?.message || "Không thể nộp kết quả kiểm tra");
    } finally {
      setSubmitting(false);
    }
  };

  const hasAnyFail = Object.values(answers).some((a) => !a.isPassed);

  return (
    <Modal
      zIndex={2500}
      title={
        <div className="flex items-center gap-2">
          <ClipboardCheck size={20} className="text-blue-600" />
          <span>Thực hiện kiểm tra định kỳ (Inspection Runner)</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={720}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Đóng
        </Button>,
        <Button
          key="submit"
          type="primary"
          danger={hasAnyFail}
          loading={submitting}
          onClick={handleSubmit}
          className="font-medium"
        >
          {hasAnyFail ? "Nộp kết quả (Tự sinh Sự cố nếu có lỗi)" : "Nộp biên bản kiểm tra (Đạt chuẩn)"}
        </Button>,
      ]}
    >
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <Spin size="large" />
        </div>
      ) : checklist ? (
        <div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-900 dark:text-gray-100 mr-2">
                  {asset?.name}
                </span>
                <Tag color="blue">{asset?.asset_code}</Tag>
              </div>
              <span className="text-xs text-gray-500">{asset?.location}</span>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              <strong>Checklist:</strong> {checklist.title}
            </div>
          </div>

          {hasAnyFail && (
            <Alert
              type="error"
              showIcon
              icon={<AlertTriangle size={16} />}
              message="Cảnh báo: Đang có hạng mục đánh dấu KHÔNG ĐẠT. Khi nộp, hệ thống sẽ tự động tạo Sự cố kỹ thuật gắn trực tiếp với máy này."
              className="mb-4"
            />
          )}

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
            {(checklist.items || []).map((item, idx) => {
              const currentAnswer = answers[item.item_id] || { isPassed: true, note: "", evidenceUrl: "" };
              const isFail = !currentAnswer.isPassed;

              return (
                <div
                  key={item.item_id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isFail
                      ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                      : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        <span className="text-blue-600 mr-1.5">#{idx + 1}.</span>
                        {item.question}
                      </div>
                      <div className="flex gap-2 mt-1">
                        {item.require_evidence && (
                          <Tag color="purple" className="text-xs">
                            <Camera size={11} className="inline mr-1" /> Bắt buộc ảnh
                          </Tag>
                        )}
                        <Tag color={item.fail_severity === "CRITICAL" ? "red" : "orange"} className="text-xs">
                          Mức nghiêm trọng: {item.fail_severity}
                        </Tag>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Radio.Group
                        value={currentAnswer.isPassed ? "PASS" : "FAIL"}
                        onChange={(e) => handleTogglePass(item.item_id, e.target.value === "PASS")}
                        buttonStyle="solid"
                      >
                        <Radio.Button value="PASS" className="text-emerald-600 font-medium">
                          <CheckCircle2 size={13} className="inline mr-1" /> PASS
                        </Radio.Button>
                        <Radio.Button value="FAIL" className="text-red-600 font-medium">
                          <XCircle size={13} className="inline mr-1" /> FAIL
                        </Radio.Button>
                      </Radio.Group>
                    </div>
                  </div>

                  {isFail && (
                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                      <label className="text-xs font-semibold text-red-700 dark:text-red-400 block mb-1">
                        Mô tả triệu chứng / Lý do không đạt (bắt buộc):
                      </label>
                      <Input.TextArea
                        rows={2}
                        value={currentAnswer.note}
                        onChange={(e) => handleNoteChange(item.item_id, e.target.value)}
                        placeholder="Ví dụ: Áp suất đo được chỉ 3.2 bar (dưới ngưỡng 4.5 bar), trục kêu rít..."
                        className="border-red-300 focus:border-red-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500">
          Chưa có mẫu checklist nào cho thiết bị này.
        </div>
      )}
    </Modal>
  );
};

export default InspectionRunnerModal;
