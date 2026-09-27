import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Modal, Form, Input, Select, message } from "antd";
import { AlertTriangle, Plus, Clock, Wrench, CheckCircle2 } from "lucide-react";
import { getIncidents, reportIncident, type IncidentItem } from "@/api/incidents";
import { getAssets, type Asset } from "@/api/assets";

const IncidentHubPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incRes, assetRes] = await Promise.all([getIncidents(), getAssets()]);
      if (incRes?.data) setIncidents(incRes.data);
      if (assetRes?.data) setAssets(assetRes.data);
    } catch (err: any) {
      message.error(err?.message || "Lỗi khi tải dữ liệu sự cố");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateIncident = async (values: any) => {
    try {
      setSubmitting(true);
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
      title: "Người báo / Thời gian",
      key: "reporter",
      render: (_: any, record: IncidentItem) => (
        <div>
          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{record.reporter_name || "N/A"}</div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(record.reported_at).toLocaleString("vi-VN")}
          </div>
        </div>
      ),
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
          <Button onClick={fetchData} loading={loading}>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {incidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length}
            </div>
            <div className="text-xs text-gray-500">Sự cố nghiêm trọng</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {incidents.filter((i) => i.state_code === "IN_PROGRESS").length}
            </div>
            <div className="text-xs text-gray-500">Đang xử lý khắc phục</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {incidents.filter((i) => i.state_code === "RESOLVED").length}
            </div>
            <div className="text-xs text-gray-500">Đã giải quyết xong</div>
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
    </div>
  );
};

export default IncidentHubPage;
