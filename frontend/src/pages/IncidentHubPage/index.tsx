import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Modal, Form, Input, Select, message, Image, Tooltip, Segmented, Drawer } from "antd";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Plus, Clock, Wrench, CheckCircle2, PackagePlus, UserCheck, Timer, Gauge, Sparkles, RotateCcw, Activity } from "lucide-react";
import { getIncidents, reportIncident, getDowntimeStats, cleanTestIncidents, type IncidentItem, type DowntimeStats } from "@/api/incidents";
import { getAssets, type Asset } from "@/api/assets";
import { SLABadge } from "@/components/SLABadge";
import { WorkflowTransitionBar } from "@/components/WorkflowTransitionBar";
import { RequestPartsModal } from "./components/RequestPartsModal";
import { AIAnalyticsModal } from "./components/AIAnalyticsModal";
import { getFileUrl } from "@/utils/imageUrl";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";

const IncidentHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [downtimeStats, setDowntimeStats] = useState<DowntimeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [partsModalOpen, setPartsModalOpen] = useState(false);
  const [aiAnalyticsModalOpen, setAiAnalyticsModalOpen] = useState(false);
  const [selectedIncidentForParts, setSelectedIncidentForParts] = useState<IncidentItem | null>(null);
  const [focusedIncident, setFocusedIncident] = useState<IncidentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [period, setPeriod] = useState<string>("month");
  const [cleaningTest, setCleaningTest] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async (targetPeriod: string = period) => {
    try {
      setLoading(true);
      const [incRes, assetRes, statsRes] = await Promise.all([
        getIncidents(),
        getAssets(),
        getDowntimeStats(targetPeriod).catch(() => null),
      ]);
      if (incRes?.data) setIncidents(incRes.data);
      if (assetRes?.data) setAssets(assetRes.data);
      if (statsRes?.data) setDowntimeStats(statsRes.data);
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi tải dữ liệu sự cố");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period);
  }, [period]);

  // Tự động nhận diện query param incidentId hoặc taskId để mở pop-up chi tiết sự cố (Deeplink)
  const targetIncidentId = searchParams.get("incidentId");
  const targetTaskId = searchParams.get("taskId");

  useEffect(() => {
    if (incidents.length > 0) {
      if (targetIncidentId) {
        const found = incidents.find((i) => String(i.incident_id) === String(targetIncidentId));
        if (found) setFocusedIncident(found);
      } else if (targetTaskId) {
        const found = incidents.find((i) => String(i.task_id) === String(targetTaskId));
        if (found) setFocusedIncident(found);
      }
    }
  }, [incidents, targetIncidentId, targetTaskId]);

  // Lắng nghe sự kiện Realtime Socket.IO: Tự động cập nhật bảng không cần F5
  useRealtimeEvents({
    onIncidentCreated: (newInc: any) => {
      // 1. Tự động chèn dòng sự cố mới lên đầu bảng
      setIncidents((prev) => {
        if (prev.some((item) => item.incident_id === newInc.incident_id)) return prev;
        return [newInc, ...prev];
      });

      // 2. Phát thông báo Toast nổi bật
      if (newInc.severity === "CRITICAL" || newInc.severity === "HIGH") {
        message.error(`🚨 [${newInc.severity}] Sự cố mới: ${newInc.task_name} trên máy ${newInc.asset_name || "N/A"}`);
      } else {
        message.warning(`⚡ Sự cố mới phát sinh: ${newInc.task_name}`);
      }

      // Kéo lại số liệu downtime ngầm
      fetchData(period);
    },

    onWorkflowTransitioned: (transition: any) => {
      // Tự động đổi màu Tag trạng thái trên bảng
      setIncidents((prev) =>
        prev.map((item) =>
          item.task_id === transition.task_id
            ? {
                ...item,
                state_code: transition.current_state,
                state_name: transition.current_state_name || transition.current_state,
              }
            : item
        )
      );

      // Nếu đang mở Drawer xem chi tiết thì cập nhật luôn Drawer
      setFocusedIncident((cur) => {
        if (cur && cur.task_id === transition.task_id) {
          return {
            ...cur,
            state_code: transition.current_state,
            state_name: transition.current_state_name || transition.current_state,
          };
        }
        return cur;
      });

      message.info(
        `🔄 Sự cố #${transition.incident_id || transition.task_id} đã chuyển sang [${transition.current_state_name || transition.current_state}] bởi ${transition.actor_name || "Kỹ thuật viên"}`
      );
    },
  });

  const handleCleanTestData = () => {
    Modal.confirm({
      title: "Dọn dẹp sự cố kiểm thử?",
      content:
        "Hệ thống sẽ xóa các sự cố mock kiểm thử (Test Gate...) để giải phóng các số liệu Downtime ảo và đưa bảng số liệu về 0 sạch sẽ. Bạn có chắc chắn muốn thực hiện?",
      okText: "Xác nhận dọn dẹp",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setCleaningTest(true);
          const res = await cleanTestIncidents();
          message.success(res.message || "Đã dọn dẹp dữ liệu kiểm thử thành công!");
          await fetchData(period);
        } catch (err: any) {
          message.error("Lỗi khi dọn dẹp: " + (err?.message || ""));
        } finally {
          setCleaningTest(false);
        }
      },
    });
  };

  const handleCreateIncident = async (values: any) => {
    try {
      setSubmitting(true);

      // --- XỬ LÝ NGOẠI TUYẾN KHI MẤT MẠNG (OFFLINE INTERCEPT) ---
      if (!navigator.onLine) {
        const { enqueueAction } = await import("@/services/offlineQueue");
        const tempId = `temp_${Date.now()}`;
        const selectedAsset = assets.find((a) => a.asset_id === values.asset_id);

        enqueueAction({
          action_type: "REPORT_INCIDENT",
          payload: {
            title: values.title,
            symptom: values.symptom,
            asset_id: values.asset_id,
            severity: values.severity,
            temp_id: tempId,
          },
        });

        // Cập nhật lạc quan (Optimistic UI) hiển thị ngay lập tức trên bảng
        const optimisticIncident: IncidentItem = {
          incident_id: tempId as any,
          task_id: tempId as any,
          task_name: values.title,
          task_description: values.symptom || "",
          symptom: values.symptom,
          evidence_urls: [],
          severity: values.severity,
          asset_name: selectedAsset?.name || "Thiết bị ngoại tuyến",
          asset_code: selectedAsset?.asset_code || "OFFLINE",
          asset_location: selectedAsset?.location || "Chưa rõ",
          state_name: "Chờ đồng bộ (Offline)",
          state_code: "OFFLINE_PENDING",
          state_color: "orange",
          reported_at: new Date().toISOString(),
          reporter_name: "Bạn (Offline)",
          downtime_minutes: 0,
          sla_status: "IN_SLA",
        };

        setIncidents((prev) => [optimisticIncident, ...prev]);
        message.warning("⚡ Đang ngoại tuyến! Sự cố đã được lưu vào máy và sẽ tự động đồng bộ khi có mạng.");
        setCreateModalOpen(false);
        form.resetFields();
        return;
      }

      await reportIncident({
        title: values.title,
        symptom: values.symptom,
        asset_id: values.asset_id,
        severity: values.severity,
      });
      message.success("Báo cáo sự cố thành công!");
      setCreateModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể tạo sự cố");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Mã & Tên sự cố",
      key: "name",
      render: (_: any, record: IncidentItem) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{record.task_name}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{record.symptom}</div>
          <div className="mt-1 text-xs text-gray-400">
            {record.asset_name ? `Thiết bị: ${record.asset_code} (${record.asset_name})` : "Sự cố chung"}
          </div>
        </div>
      ),
    },
    {
      title: "Mức độ (Severity)",
      dataIndex: "severity",
      key: "severity",
      render: (severity: string) => {
        const color =
          severity === "CRITICAL"
            ? "red"
            : severity === "HIGH"
            ? "orange"
            : severity === "MEDIUM"
            ? "gold"
            : "blue";
        return <Tag color={color}>{severity}</Tag>;
      },
    },
    {
      title: "Trạng thái Quy trình",
      key: "state",
      render: (_: any, record: IncidentItem) => (
        <Tag color={record.state_color || "default"}>
          {record.state_name || record.state_code || "REPORTED"}
        </Tag>
      ),
    },
    {
      title: "Cam kết SLA",
      key: "sla",
      render: (_: any, record: IncidentItem) => (
        <SLABadge
          status={record.sla_status || "IN_SLA"}
          stateCode={record.state_code}
          deadlineAt={record.sla_deadline_at}
          startedAt={record.sla_started_at}
        />
      ),
    },
    {
      title: "Người báo / Thời gian",
      key: "reporter",
      render: (_: any, record: IncidentItem) => (
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{record.reporter_name || "N/A"}</div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(record.reported_at).toLocaleString("vi-VN")}
          </div>
          {record.assignee_name && (
            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <UserCheck size={11} className="text-purple-600" />
              <span>KTV: {record.assignee_name}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Thời gian dừng máy (Downtime)",
      key: "downtime",
      render: (_: any, record: IncidentItem) => {
        if (record.resolved_at && record.downtime_minutes != null) {
          const hours = Math.floor(record.downtime_minutes / 60);
          const mins = record.downtime_minutes % 60;
          const label = hours > 0 ? `${hours}h ${mins}p` : `${mins} phút`;
          return (
            <div>
              <Tag color="volcano" className="font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Timer size={12} /> {label}
              </Tag>
              <div className="text-[10px] text-gray-400 mt-1">
                Phục hồi: {new Date(record.resolved_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        }
        if (record.state_code === "RESOLVED" || record.state_code === "CLOSED") {
          return <Tag color="green">Đã phục hồi</Tag>;
        }
        return (
          <Tag color="processing" className="text-gray-500 inline-flex items-center gap-1">
            <Clock size={11} /> Đang tính giờ...
          </Tag>
        );
      },
    },
    {
      title: "Bằng chứng & AI",
      key: "evidence",
      width: 170,
      render: (_: any, record: IncidentItem) => {
        const hasEvidence = record.resolved_evidence_urls && record.resolved_evidence_urls.length > 0;
        if (!hasEvidence) {
          return (
            <span className="text-xs text-gray-400 italic">
              {record.state_code === "RESOLVED" || record.state_code === "CLOSED" ? "Chưa có ảnh" : "-"}
            </span>
          );
        }

        const isVerified = record.ai_evidence_status === "VERIFIED";
        const isWarning = record.ai_evidence_status === "WARNING";

        return (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Image.PreviewGroup>
                {record.resolved_evidence_urls!.map((url, idx) => (
                  <Image
                    key={idx}
                    src={getFileUrl(url)}
                    alt="Bằng chứng"
                    width={44}
                    height={44}
                    className="rounded-lg object-cover border border-gray-200 dark:border-gray-700 shadow-xs hover:opacity-90"
                  />
                ))}
              </Image.PreviewGroup>
            </div>

            {/* AI Status Badge */}
            {isVerified && (
              <Tooltip title={record.ai_evidence_feedback || "AI nhận diện chi tiết máy móc hợp lệ"}>
                <Tag color="success" className="text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 cursor-help">
                  <Sparkles size={10} className="text-emerald-500" /> AI Đạt ({record.ai_evidence_score || 90}%)
                </Tag>
              </Tooltip>
            )}

            {isWarning && (
              <Tooltip title={record.ai_evidence_feedback || "AI phát hiện nghi vấn về ảnh hiện trường, cần Quản đốc thẩm định"}>
                <Tag color="warning" className="text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 cursor-help font-medium">
                  <AlertTriangle size={10} className="text-amber-600" /> AI Cảnh báo ({record.ai_evidence_score || 25}%)
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Quy trình FSM & Thao tác",
      key: "actions",
      width: 320,
      render: (_: any, record: IncidentItem) => {
        const canRequestParts = record.state_code === "IN_PROGRESS";
        return (
          <div className="space-y-2">
            <WorkflowTransitionBar
              taskId={record.task_id}
              taskName={record.task_name}
              assetName={record.asset_name || record.asset_code}
              symptom={record.symptom}
              currentStateCode={record.state_code}
              onTransitionSuccess={fetchData}
              size="small"
            />
            {canRequestParts && (
              <div>
                <Button
                  size="small"
                  className="inline-flex items-center text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 text-xs font-medium"
                  icon={<PackagePlus size={13} className="mr-1 text-amber-600" />}
                  onClick={() => {
                    setSelectedIncidentForParts(record);
                    setPartsModalOpen(true);
                  }}
                >
                  Xin cấp vật tư (Tạm dừng SLA)
                </Button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Field Incident Hub (Quản Lý Sự Cố Hiện Trường)
            </h1>
            <p className="text-sm text-gray-500">
              Tiếp nhận, phân loại và điều phối xử lý sự cố thiết bị nhà xưởng kết nối SLA thời gian thực
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="primary"
            icon={<Activity className="w-4 h-4 inline mr-1 text-yellow-300" />}
            onClick={() => navigate('/analytics')}
            className="bg-linear-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-indigo-500 border-none shadow-sm font-semibold text-white"
          >
            Điều Hành CMMS & AI Hub
          </Button>
          <Button onClick={() => fetchData(period)} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            danger
            icon={<Plus className="w-4 h-4 inline mr-1" />}
            onClick={() => setCreateModalOpen(true)}
          >
            Báo cáo sự cố mới
          </Button>
        </div>
      </div>

      {/* Thanh Điều hướng Chu kỳ Thời gian & Thao tác Quản trị */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Chu kỳ thống kê:
          </span>
          <Segmented
            value={period}
            onChange={(val) => setPeriod(val as string)}
            options={[
              { label: "Ca hôm nay", value: "today" },
              { label: "Tuần này", value: "week" },
              { label: "Tháng này (Chuẩn)", value: "month" },
              { label: "Toàn thời gian", value: "all" },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title="Dọn dẹp các sự cố mock kiểm thử (Test Gate) để giải phóng các giờ dừng máy ảo và đưa số liệu về 0 sạch sẽ">
            <Button
              size="small"
              icon={<RotateCcw size={13} className="text-rose-500" />}
              loading={cleaningTest}
              onClick={handleCleanTestData}
              className="text-xs text-gray-600 dark:text-gray-300 hover:text-rose-600"
            >
              Dọn ca test (Reset 0h)
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* KPI Stats Cards (Downtime, MTTR & Hiệu suất FSM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Tổng thời gian dừng máy */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <Timer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {downtimeStats?.formattedTotalDowntime || "0 phút"}
            </div>
            <div className="text-xs text-gray-500 font-medium">Tổng Downtime phân xưởng</div>
            {downtimeStats?.topDowntimeAssets?.[0] && (
              <div className="text-[10px] text-rose-500 truncate mt-0.5">
                Top: {downtimeStats.topDowntimeAssets[0].asset_code} ({downtimeStats.topDowntimeAssets[0].total_downtime_minutes}p)
              </div>
            )}
          </div>
        </div>

        {/* Thẻ 2: Chỉ số MTTR */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
              {downtimeStats?.mttrMinutes || 0} <span className="text-xs font-normal text-gray-500">phút/sự cố</span>
            </div>
            <div className="text-xs text-gray-500 font-medium">MTTR (Khắc phục TB)</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Dựa trên {downtimeStats?.resolvedIncidents || 0} sự cố đã đóng
            </div>
          </div>
        </div>

        {/* Thẻ 3: Sự cố đang mở & khẩn cấp */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
              {downtimeStats?.openIncidents ?? incidents.filter((i) => i.state_code !== "RESOLVED" && i.state_code !== "CLOSED").length}
            </div>
            <div className="text-xs text-gray-500 font-medium">Đang xử lý / Khắc phục</div>
            <div className="text-[10px] text-red-500 font-medium mt-0.5">
              {incidents.filter((i) => (i.severity === "CRITICAL" || i.severity === "HIGH") && i.state_code !== "RESOLVED").length} sự cố nguy cấp
            </div>
          </div>
        </div>

        {/* Thẻ 4: Tỉ lệ đạt SLA */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-gray-900 dark:text-gray-100">
              {downtimeStats && (downtimeStats.slaMetCount + downtimeStats.slaBreachedCount > 0)
                ? `${Math.round((downtimeStats.slaMetCount / (downtimeStats.slaMetCount + downtimeStats.slaBreachedCount)) * 100)}%`
                : "100%"}
            </div>
            <div className="text-xs text-gray-500 font-medium">Tỉ lệ đạt hạn SLA</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              {downtimeStats?.slaMetCount || 0} đúng hạn / {downtimeStats?.slaBreachedCount || 0} trễ
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <Table
          dataSource={incidents}
          columns={columns}
          rowKey="incident_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Không có sự cố nào được ghi nhận." }}
          onRow={(record) => ({
            onClick: () => {
              setFocusedIncident(record);
              setSearchParams({ incidentId: String(record.incident_id) });
            },
            className: "cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors",
          })}
        />
      </div>

      {/* Modal Report Incident */}
      <Modal
        title="Báo cáo sự cố thiết bị mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Gửi báo cáo"
        zIndex={3000}
        getContainer={() => document.body}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateIncident} initialValues={{ severity: "MEDIUM" }}>
          <Form.Item name="title" label="Tiêu đề sự cố" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
            <Input placeholder="Vd: Máy rung bất thường, rò rỉ dầu..." />
          </Form.Item>

          <Form.Item name="asset_id" label="Thiết bị gặp sự cố">
            <Select placeholder="Chọn thiết bị hoặc để trống nếu là sự cố chung" allowClear>
              {assets.map((a) => (
                <Select.Option key={a.asset_id} value={a.asset_id}>
                  {a.asset_code} - {a.name} ({a.location})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="severity" label="Mức độ nghiêm trọng">
            <Select>
              <Select.Option value="LOW">Thấp (LOW)</Select.Option>
              <Select.Option value="MEDIUM">Trung bình (MEDIUM)</Select.Option>
              <Select.Option value="HIGH">Cao (HIGH)</Select.Option>
              <Select.Option value="CRITICAL">Khẩn cấp (CRITICAL - SLA 60 phút)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="symptom" label="Mô tả hiện tượng / Triệu chứng" rules={[{ required: true, message: "Vui lòng mô tả hiện tượng" }]}>
            <Input.TextArea rows={3} placeholder="Mô tả chi tiết âm thanh, đèn cảnh báo, lỗi hiển thị trên màn hình máy..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Request Spare Parts */}
      <RequestPartsModal
        open={partsModalOpen}
        incident={selectedIncidentForParts}
        onClose={() => setPartsModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* Drawer Chi tiết Sự cố Đang chọn (Deeplink Focus Modal) */}
      <Drawer
        title={
          focusedIncident ? (
            <div className="flex items-center justify-between pr-4">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-gray-900 dark:text-gray-100">
                  Sự cố #{focusedIncident.incident_id}: {focusedIncident.task_name}
                </span>
                <Tag color={focusedIncident.severity === "CRITICAL" ? "red" : focusedIncident.severity === "HIGH" ? "orange" : "blue"}>
                  {focusedIncident.severity}
                </Tag>
              </div>
            </div>
          ) : (
            "Chi tiết sự cố"
          )
        }
        placement="right"
        width={580}
        zIndex={1000}
        open={!!focusedIncident}
        onClose={() => {
          setFocusedIncident(null);
          setSearchParams({});
        }}
      >
        {focusedIncident && (
          <div className="space-y-5">
            {/* 1. Trạng thái & SLA Header */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400 font-medium">Trạng thái quy trình</div>
                <div className="mt-1">
                  <Tag color={focusedIncident.state_color || "blue"} className="font-semibold px-2.5 py-0.5 text-xs">
                    {focusedIncident.state_name || focusedIncident.state_code}
                  </Tag>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 font-medium">Cam kết SLA</div>
                <div className="mt-1">
                  <SLABadge
                    status={focusedIncident.sla_status || "IN_SLA"}
                    stateCode={focusedIncident.state_code}
                    deadlineAt={focusedIncident.sla_deadline_at}
                    startedAt={focusedIncident.sla_started_at}
                  />
                </div>
              </div>
            </div>

            {/* 2. Thiết bị liên kết */}
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/30 dark:bg-indigo-950/20">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1.5 flex items-center gap-1.5">
                <Wrench size={14} /> Thiết bị liên quan
              </div>
              <div className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                {focusedIncident.asset_name ? `${focusedIncident.asset_name} (${focusedIncident.asset_code})` : "Sự cố vận hành chung"}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span>Phòng ban: {(focusedIncident as any).department_name || "Phân xưởng sản xuất"}</span>
              </div>
            </div>

            {/* 3. Triệu chứng & Người báo */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Mô tả hiện tượng / Triệu chứng
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700 whitespace-pre-wrap">
                {focusedIncident.symptom || "Chưa có mô tả chi tiết."}
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800">
                <span>Người báo: <strong className="text-gray-700 dark:text-gray-300">{focusedIncident.reporter_name || "N/A"}</strong></span>
                <span>Thời gian: {new Date(focusedIncident.reported_at).toLocaleString("vi-VN")}</span>
              </div>
            </div>

            {/* 4. Thao tác Quy trình FSM */}
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 space-y-3">
              <div className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                Chuyển trạng thái xử lý sự cố (FSM)
              </div>
              <WorkflowTransitionBar
                taskId={focusedIncident.task_id}
                taskName={focusedIncident.task_name}
                assetName={focusedIncident.asset_name || focusedIncident.asset_code}
                symptom={focusedIncident.symptom}
                currentStateCode={focusedIncident.state_code}
                onTransitionSuccess={async () => {
                  await fetchData();
                  const res = await getIncidents();
                  if (res?.data) {
                    setIncidents(res.data);
                    const updated = res.data.find((i) => i.incident_id === focusedIncident.incident_id);
                    if (updated) setFocusedIncident(updated);
                  }
                }}
              />
              {focusedIncident.state_code === "IN_PROGRESS" && (
                <div className="pt-2 border-t border-purple-100 dark:border-purple-900/30">
                  <Button
                    className="w-full text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 font-semibold"
                    icon={<PackagePlus size={14} className="mr-1 text-amber-600" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIncidentForParts(focusedIncident);
                      setPartsModalOpen(true);
                    }}
                  >
                    Xin cấp vật tư phụ tùng (Đóng băng SLA)
                  </Button>
                </div>
              )}
            </div>

            {/* 5. Bằng chứng nghiệm thu & Đánh giá AI */}
            {focusedIncident.resolved_evidence_urls && focusedIncident.resolved_evidence_urls.length > 0 && (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Ảnh bằng chứng sau khắc phục</span>
                  {focusedIncident.ai_evidence_status === "VERIFIED" && (
                    <Tag color="success" className="text-[10px]">AI Hợp lệ ({focusedIncident.ai_evidence_score || 90}%)</Tag>
                  )}
                </div>
                <div className="flex gap-2">
                  <Image.PreviewGroup>
                    {focusedIncident.resolved_evidence_urls.map((url, idx) => (
                      <Image
                        key={idx}
                        src={getFileUrl(url)}
                        alt="Bằng chứng"
                        width={80}
                        height={80}
                        className="rounded-xl object-cover border border-gray-200 dark:border-gray-700 shadow-xs"
                      />
                    ))}
                  </Image.PreviewGroup>
                </div>
                {focusedIncident.ai_evidence_feedback && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-white/60 dark:bg-gray-800/60 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    💡 Nhận xét AI: {focusedIncident.ai_evidence_feedback}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Pop-up Điều hành AI Executive Analytics & Thẻ Hành Động Action Cards */}
      <AIAnalyticsModal
        open={aiAnalyticsModalOpen}
        onClose={() => setAiAnalyticsModalOpen(false)}
        currentPeriod={period}
        onIncidentCreated={() => fetchData(period)}
      />
    </div>
  );
};

export default IncidentHubPage;
