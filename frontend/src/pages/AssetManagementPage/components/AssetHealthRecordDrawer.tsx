import React, { useEffect, useState, useCallback } from "react";
import {
  Drawer,
  Spin,
  Tag,
  Tooltip,
  Timeline,
  message,
  Select,
  Input,
  Form,
} from "antd";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Flame,
  Gauge,
  ShieldAlert,
  Zap,
  Clock,
  User2,
  ArrowDownCircle,
  FileCheck,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { getAssetHealthRecord, type Asset, type HealthTimelineEvent, type HealthScoreSnapshot } from "@/api/assets";
import { reportIncident } from "@/api/incidents";
import { getAssetChecklist, submitInspection } from "@/api/inspections";

/* ──────────────────────────────────────────────
   Health Score Ring (SVG-based gauge)
────────────────────────────────────────────── */
const HealthGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : score >= 25 ? "#f97316" : "#ef4444";

  const label =
    score >= 80 ? "Tốt" : score >= 60 ? "Trung bình" : score >= 40 ? "Cần chú ý" : "Nguy hiểm";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth="10"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            strokeWidth="10"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold" style={{ color }}>
            {score}
          </span>
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
            / 100
          </span>
        </div>
      </div>
      <Tag
        color={score >= 80 ? "green" : score >= 50 ? "gold" : score >= 25 ? "orange" : "red"}
        className="font-semibold text-xs px-3 py-0.5 rounded-full"
      >
        {label}
      </Tag>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Severity badge helper
────────────────────────────────────────────── */
const SeverityBadge: React.FC<{ severity?: string }> = ({ severity }) => {
  const map: Record<string, { color: string; label: string }> = {
    CRITICAL: { color: "red", label: "CRITICAL" },
    HIGH: { color: "orange", label: "HIGH" },
    MEDIUM: { color: "gold", label: "MEDIUM" },
    LOW: { color: "blue", label: "LOW" },
  };
  const entry = map[severity || ""] || { color: "default", label: severity || "-" };
  return <Tag color={entry.color} className="text-[10px] font-bold">{entry.label}</Tag>;
};

/* ──────────────────────────────────────────────
   Timeline event dot colour helper
────────────────────────────────────────────── */
const timelineDot = (event: HealthTimelineEvent) => {
  if (event.type === "INSPECTION") {
    return event.status === "PASS" ? (
      <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
    );
  }
  const incColors: Record<string, string> = {
    CRITICAL: "text-red-600",
    HIGH: "text-orange-500",
    MEDIUM: "text-amber-500",
    LOW: "text-blue-400",
  };
  const cls = incColors[event.severity || ""] || "text-gray-500";
  return <Flame className={`w-3.5 h-3.5 ${cls}`} />;
};

const QUICK_SYMPTOMS = [
  "Rung lắc bất thường",
  "Nhiệt độ trục chính quá cao",
  "Tiếng ồn cơ khí lạ",
  "Rò rỉ dung dịch bôi trơn",
  "Dừng đột ngột giữa chu kỳ",
  "Khói / mùi khét",
];

/* ──────────────────────────────────────────────
   MAIN DRAWER (With Seamless Inline Sub-views)
────────────────────────────────────────────── */
interface Props {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
}

type DrawerMode = "RECORD" | "REPORT_INCIDENT" | "RUN_CHECKLIST";

const AssetHealthRecordDrawer: React.FC<Props> = ({ open, asset, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<any>(null);
  const [mode, setMode] = useState<DrawerMode>("RECORD");

  // State cho Báo Sự Cố
  const [reportForm] = Form.useForm();
  const [submittingReport, setSubmittingReport] = useState(false);

  // State cho Kiểm Tra Đầu Ca
  const [checklist, setChecklist] = useState<any>(null);
  const [loadingCL, setLoadingCL] = useState(false);
  const [answers, setAnswers] = useState<Record<number, boolean | null>>({});
  const [submittingCL, setSubmittingCL] = useState(false);

  // Tải hồ sơ sức khoẻ
  const fetchRecord = useCallback(async () => {
    if (!asset) return;
    try {
      setLoading(true);
      const res = await getAssetHealthRecord(asset.asset_id);
      setRecord(res?.data || null);
    } catch {
      message.error("Không thể tải hồ sơ sức khoẻ thiết bị");
    } finally {
      setLoading(false);
    }
  }, [asset]);

  // Tải checklist khi chuyển sang mode RUN_CHECKLIST
  const loadChecklist = useCallback(async () => {
    if (!asset) return;
    try {
      setLoadingCL(true);
      const res = await getAssetChecklist(asset.asset_id);
      setChecklist(res?.data || null);
      if (res?.data?.items) {
        const defaults: Record<number, boolean | null> = {};
        (res.data.items as any[]).forEach((it) => {
          defaults[it.item_id] = true;
        });
        setAnswers(defaults);
      }
    } catch {
      message.error("Không tải được checklist");
    } finally {
      setLoadingCL(false);
    }
  }, [asset]);

  useEffect(() => {
    if (open && asset) {
      setRecord(null);
      setMode("RECORD");
      fetchRecord();
    }
  }, [open, asset, fetchRecord]);

  useEffect(() => {
    if (mode === "RUN_CHECKLIST") {
      loadChecklist();
    } else if (mode === "REPORT_INCIDENT") {
      reportForm.resetFields();
      if (asset) {
        reportForm.setFieldsValue({
          title: `Sự cố tại ${asset.name}`,
          severity: "HIGH",
        });
      }
    }
  }, [mode, loadChecklist, reportForm, asset]);

  // Xử lý gửi Báo Cáo Sự Cố
  const handleReportSubmit = async () => {
    try {
      const vals = await reportForm.validateFields();
      setSubmittingReport(true);
      await reportIncident({
        title: vals.title,
        symptom: vals.symptom,
        severity: vals.severity,
        asset_id: asset?.asset_id,
      });
      message.success("✅ Đã gửi báo cáo sự cố! Điểm sức khoẻ đã cập nhật.");
      reportForm.resetFields();
      setMode("RECORD");
      fetchRecord();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error("Lỗi khi báo sự cố: " + (err?.message || "Unknown"));
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleAppendSymptom = (tag: string) => {
    const cur = reportForm.getFieldValue("symptom") || "";
    reportForm.setFieldsValue({
      symptom: cur ? `${cur}, ${tag}` : tag,
    });
  };

  // Xử lý nộp Checklist
  const handlePassAllCL = () => {
    if (!checklist?.items) return;
    const allPass: Record<number, boolean | null> = {};
    (checklist.items as any[]).forEach((it) => {
      allPass[it.item_id] = true;
    });
    setAnswers(allPass);
  };

  const handleFailAllCL = () => {
    if (!checklist?.items) return;
    const allFail: Record<number, boolean | null> = {};
    (checklist.items as any[]).forEach((it) => {
      allFail[it.item_id] = false;
    });
    setAnswers(allFail);
  };

  const handleInspectionSubmit = async () => {
    if (!asset || !checklist) return;
    try {
      setSubmittingCL(true);
      const results = (checklist.items as any[]).map((it) => ({
        itemId: it.item_id,
        isPassed: answers[it.item_id] !== false,
        note: "",
      }));
      const res = await submitInspection({
        assetId: asset.asset_id,
        checklistId: checklist.checklist_id,
        results,
      });
      if (res?.data?.overallStatus === "FAIL") {
        message.warning(`⚠️ Kết quả: FAIL (${res.data.failedCount} mục). Đã tự động tạo sự cố và trừ điểm!`);
      } else {
        message.success("✅ Kiểm tra hoàn tất: PASS 100%! Thiết bị vận hành hoàn hảo.");
      }
      setMode("RECORD");
      fetchRecord();
    } catch (err: any) {
      message.error("Lỗi: " + (err?.message || "Unknown"));
    } finally {
      setSubmittingCL(false);
    }
  };

  const score = record?.healthScore ?? 0;
  const timeline: HealthTimelineEvent[] = record?.timeline || [];
  const totalCountCL = checklist?.items?.length || 0;
  const passCountCL = Object.values(answers).filter((v) => v === true).length;
  const failCountCL = Object.values(answers).filter((v) => v === false).length;

  return (
    <Drawer
      open={open}
      onClose={() => {
        setMode("RECORD");
        onClose();
      }}
      width={560}
      title={null}
      styles={{ body: { padding: 0 }, header: { display: "none" } }}
      destroyOnClose
    >
      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 1: BÁO SỰ CỐ TRỰC TIẾP TẠI CHỖ (INLINE)
      ───────────────────────────────────────────────────────────── */}
      {mode === "REPORT_INCIDENT" && (
        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
          {/* Header Báo sự cố */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-rose-50/60 dark:bg-rose-950/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode("RECORD")}
                className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <div>
                <h3 className="font-extrabold text-base text-rose-700 dark:text-rose-400 flex items-center gap-1.5 m-0 leading-tight">
                  <Zap className="w-4 h-4" /> Báo Sự Cố Nhanh (1-Touch)
                </h3>
                <div className="text-xs text-gray-500 font-mono">
                  {asset?.asset_code} — {asset?.name}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-lg font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Form nội dung */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="p-3 mb-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-400">Vị trí lắp đặt:</span>{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {asset?.location || "Xưởng sản xuất"}
                </span>
              </div>
              <Tag color="red">Tự động trừ điểm sức khoẻ</Tag>
            </div>

            <Form form={reportForm} layout="vertical">
              <Form.Item
                name="title"
                label={<span className="font-semibold text-xs text-gray-700 dark:text-gray-300">Tiêu đề sự cố</span>}
                rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
              >
                <Input size="large" placeholder="VD: Trục chính quá nhiệt, dừng chu trình..." />
              </Form.Item>

              <Form.Item
                name="symptom"
                label={<span className="font-semibold text-xs text-gray-700 dark:text-gray-300">Mô tả triệu chứng hiện trường</span>}
                rules={[{ required: true, message: "Vui lòng mô tả triệu chứng" }]}
              >
                <Input.TextArea
                  rows={4}
                  placeholder="Mô tả chi tiết hiện tượng gặp phải..."
                  className="text-sm"
                />
              </Form.Item>

              {/* Tag gợi ý triệu chứng */}
              <div className="mb-4 -mt-2">
                <div className="text-[11px] text-gray-400 mb-1.5 font-medium">Gợi ý triệu chứng nhanh (click để thêm):</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SYMPTOMS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleAppendSymptom(sym)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 dark:bg-gray-800 dark:hover:bg-rose-950/50 text-gray-600 hover:text-rose-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                    >
                      + {sym}
                    </button>
                  ))}
                </div>
              </div>

              <Form.Item
                name="severity"
                label={<span className="font-semibold text-xs text-gray-700 dark:text-gray-300">Mức độ nghiêm trọng</span>}
                initialValue="HIGH"
              >
                <Select size="large">
                  <Select.Option value="LOW">🟦 LOW – Nhẹ (-5 điểm)</Select.Option>
                  <Select.Option value="MEDIUM">🟨 MEDIUM – Trung bình (-10 điểm)</Select.Option>
                  <Select.Option value="HIGH">🟧 HIGH – Nghiêm trọng (-20 điểm)</Select.Option>
                  <Select.Option value="CRITICAL">🟥 CRITICAL – Khẩn cấp (-30 điểm)</Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </div>

          {/* Footer nút bấm */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMode("RECORD")}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm transition-colors cursor-pointer"
            >
              Hủy / Quay lại
            </button>
            <button
              type="button"
              onClick={handleReportSubmit}
              disabled={submittingReport}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {submittingReport ? <Spin size="small" /> : <Zap className="w-4 h-4" />}
              GỬI BÁO CÁO SỰ CỐ NGAY
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 2: KIỂM TRA ĐẦU CA TRỰC TIẾP TẠI CHỖ (INLINE)
      ───────────────────────────────────────────────────────────── */}
      {mode === "RUN_CHECKLIST" && (
        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
          {/* Header Kiểm tra đầu ca */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-indigo-50/60 dark:bg-indigo-950/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode("RECORD")}
                className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <div>
                <h3 className="font-extrabold text-base text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 m-0 leading-tight">
                  <ClipboardCheck className="w-4 h-4" /> Kiểm Tra Đầu Ca (Checklist)
                </h3>
                <div className="text-xs text-gray-500 font-mono">
                  {asset?.asset_code} — {asset?.name}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-lg font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Nội dung Checklist */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loadingCL ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <Spin tip="Đang tải checklist thiết bị..." />
              </div>
            ) : checklist ? (
              <>
                {/* Thanh tiện ích chọn nhanh */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                      ✓ {passCountCL} Đạt
                    </span>
                    {failCountCL > 0 && (
                      <span className="font-bold text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-800/40">
                        ✗ {failCountCL} Không đạt
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handlePassAllCL}
                      className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold transition-colors cursor-pointer"
                    >
                      ✓ Đạt tất cả ({totalCountCL})
                    </button>
                    <button
                      type="button"
                      onClick={handleFailAllCL}
                      className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition-colors cursor-pointer"
                    >
                      ✗ Đánh dấu lỗi mẫu
                    </button>
                  </div>
                </div>

                {/* Danh sách câu hỏi */}
                <div className="space-y-2.5">
                  {(checklist.items as any[]).map((item: any, idx: number) => {
                    const isPass = answers[item.item_id] !== false;
                    return (
                      <div
                        key={item.item_id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                          isPass
                            ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10"
                            : "border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 shadow-xs"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-400 w-5 pt-0.5">{idx + 1}.</span>
                        <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 font-medium">
                          {item.question}
                          {!isPass && (
                            <div className="text-[11px] text-red-500 font-normal mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Sẽ tạo sự cố và trừ -15 điểm
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setAnswers((p) => ({ ...p, [item.item_id]: true }))}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                              isPass
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "border-gray-300 dark:border-gray-600 text-gray-500 hover:border-emerald-400 hover:text-emerald-600"
                            }`}
                          >
                            ✓ Đạt
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnswers((p) => ({ ...p, [item.item_id]: false }))}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                              !isPass
                                ? "bg-red-600 text-white border-red-600 shadow-xs"
                                : "border-gray-300 dark:border-gray-600 text-gray-500 hover:border-red-400 hover:text-red-600"
                            }`}
                          >
                            ✗ Không
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm">
                Không tìm thấy checklist cấu hình cho thiết bị này.
              </div>
            )}
          </div>

          {/* Footer nút nộp */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMode("RECORD")}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-sm transition-colors cursor-pointer"
            >
              Hủy / Quay lại
            </button>
            <button
              type="button"
              onClick={handleInspectionSubmit}
              disabled={submittingCL || !checklist}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {submittingCL ? <Spin size="small" /> : <ClipboardCheck className="w-4 h-4" />}
              NỘP KẾT QUẢ KIỂM TRA
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-VIEW 3: HỒ SƠ SỨC KHOẺ & TIMELINE HỢP NHẤT (DEFAULT)
      ───────────────────────────────────────────────────────────── */}
      {mode === "RECORD" && (
        <div className="flex flex-col h-full bg-white dark:bg-gray-950">
          {/* Header gradient */}
          <div
            className="px-6 pt-6 pb-5 shrink-0"
            style={{
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge className="w-4 h-4 text-indigo-300" />
                  <span className="text-xs text-indigo-300 font-semibold uppercase tracking-widest">
                    Hồ Sơ Sức Khoẻ Thiết Bị
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white leading-tight">
                  {asset?.name || "—"}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <Tag
                    color={
                      asset?.status === "OPERATIONAL"
                        ? "green"
                        : asset?.status === "FAULTY"
                        ? "red"
                        : "orange"
                    }
                    className="font-mono font-bold"
                  >
                    {asset?.status}
                  </Tag>
                  <span className="text-indigo-300 text-xs font-mono">{asset?.asset_code}</span>
                  <span className="text-indigo-300/60 text-xs">• {asset?.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Làm mới dữ liệu"
                  onClick={fetchRecord}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-colors cursor-pointer font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Health Gauge */}
            {!loading && record && (
              <div className="mt-5 flex flex-col items-center">
                <HealthGauge score={score} />
                {record.scoreBreakdown?.length > 0 && (
                  <div className="mt-4 w-full space-y-1.5">
                    {record.scoreBreakdown.map((item: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs bg-white/10 rounded-lg px-3 py-1.5"
                      >
                        <span className="text-indigo-200 flex-1 mr-2 truncate">{item.reason}</span>
                        <span className="font-bold text-red-300 shrink-0">{item.delta}</span>
                      </div>
                    ))}
                  </div>
                )}
                {record.scoreBreakdown?.length === 0 && (
                  <div className="mt-3 text-xs text-indigo-300 text-center flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Không có yếu tố trừ điểm — thiết bị đang ở trạng thái lý tưởng
                  </div>
                )}
              </div>
            )}
            {loading && (
              <div className="flex justify-center mt-8 mb-4">
                <Spin tip="Đang tải hồ sơ..." />
              </div>
            )}
          </div>

          {/* Quick Actions (1-Touch Trực Tiếp Trong Drawer) */}
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 shrink-0">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Thao tác nhanh (1-Touch)
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Tương tác trực tiếp</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="quick-report-incident-btn"
                type="button"
                onClick={() => setMode("REPORT_INCIDENT")}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900/50 hover:border-rose-400 hover:shadow-md transition-all text-sm font-semibold group cursor-pointer text-left shadow-xs"
              >
                <div className="p-2 rounded-lg bg-rose-500 text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="leading-tight overflow-hidden">
                  <div className="font-bold text-xs text-rose-900 dark:text-rose-200">⚡ Báo Sự Cố</div>
                  <div className="text-[10px] text-gray-400 font-normal truncate">Khẩn cấp cho máy</div>
                </div>
              </button>

              <button
                id="quick-start-checklist-btn"
                type="button"
                onClick={() => setMode("RUN_CHECKLIST")}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-400 hover:shadow-md transition-all text-sm font-semibold group cursor-pointer text-left shadow-xs"
              >
                <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div className="leading-tight overflow-hidden">
                  <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200">📋 Bật Kiểm Tra</div>
                  <div className="text-[10px] text-gray-400 font-normal truncate">Checklist đầu ca</div>
                </div>
              </button>
            </div>
          </div>

          {/* Stats row */}
          {record && (
            <div className="px-5 py-3 grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
              <div className="pr-4 text-center">
                <div
                  className={`text-2xl font-extrabold ${
                    record.openIncidents?.length > 0 ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {record.openIncidents?.length || 0}
                </div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Sự Cố Mở</div>
              </div>
              <div className="px-4 text-center">
                <div className="text-2xl font-extrabold text-indigo-600">
                  {record.recentInspections?.filter((r: any) => r.overall_status === "PASS").length || 0}
                </div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Kiểm Tra PASS</div>
              </div>
              <div className="pl-4 text-center">
                <div className="text-2xl font-extrabold text-amber-600">
                  {record.recentInspections?.filter((r: any) => r.overall_status === "FAIL").length || 0}
                </div>
                <div className="text-[10px] text-gray-400 font-semibold uppercase">Kiểm Tra FAIL</div>
              </div>
            </div>
          )}

          {/* Lịch sử biến động điểm sức khỏe (Snapshots Audit) */}
          {record?.snapshots && record.snapshots.length > 0 && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400">
                  <Gauge className="w-3.5 h-3.5" /> Biến động điểm sức khỏe (Snapshots)
                </span>
                <span className="text-[10px] text-gray-400">Lưu vết thời gian thực</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {record.snapshots.map((snap: HealthScoreSnapshot) => (
                  <div
                    key={snap.snapshot_id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 text-xs shadow-2xs"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {snap.reason}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {new Date(snap.recorded_at).toLocaleString("vi-VN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {snap.delta !== 0 && (
                        <span
                          className={`font-bold font-mono px-1.5 py-0.5 rounded text-[11px] ${
                            snap.delta > 0
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-rose-50 text-rose-600 border border-rose-200"
                          }`}
                        >
                          {snap.delta > 0 ? `+${snap.delta}` : snap.delta}
                        </span>
                      )}
                      <Tag color="blue" className="font-mono font-bold text-xs m-0">
                        {snap.health_score}/100
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unified Timeline */}
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" /> Dòng thời gian hoạt động
            </div>
            {loading && (
              <div className="flex justify-center py-12">
                <Spin />
              </div>
            )}
            {!loading && timeline.length === 0 && (
              <div className="py-10 text-center text-gray-400 text-sm">Chưa có lịch sử hoạt động nào.</div>
            )}
            {!loading && timeline.length > 0 && (
              <Timeline
                mode="left"
                items={timeline.map((ev) => ({
                  dot: (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 shadow-xs">
                      {timelineDot(ev)}
                    </div>
                  ),
                  children: (
                    <div className="mb-4 ml-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                                ev.type === "INCIDENT"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                  : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                              }`}
                            >
                              {ev.type === "INCIDENT" ? "🔴 Sự cố" : "📋 Kiểm tra"}
                            </span>
                            {ev.severity && <SeverityBadge severity={ev.severity} />}
                            {ev.type === "INSPECTION" && (
                              <Tag color={ev.status === "PASS" ? "green" : "red"} className="text-[10px] font-bold">
                                {ev.status}
                              </Tag>
                            )}
                            {ev.type === "INCIDENT" && (
                              <Tag color={ev.status === "RESOLVED" ? "green" : "orange"} className="text-[10px]">
                                {ev.status === "RESOLVED" ? "Đã xử lý" : ev.state_name || "Đang mở"}
                              </Tag>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1 leading-tight">
                            {ev.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ev.subtitle}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ev.occurred_at).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {ev.actor && (
                          <span className="flex items-center gap-1">
                            <User2 className="w-3 h-3" /> {ev.actor}
                          </span>
                        )}
                        {ev.downtime_minutes != null && ev.downtime_minutes > 0 && (
                          <Tooltip title="Thời gian dừng máy">
                            <span className="flex items-center gap-1 text-red-400 font-semibold">
                              <ArrowDownCircle className="w-3 h-3" /> {ev.downtime_minutes}p
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ),
                }))}
              />
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default AssetHealthRecordDrawer;
