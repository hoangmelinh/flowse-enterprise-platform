import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Input, Modal, message, Space, Form, Select, QRCode } from "antd";
import { Cpu, QrCode, Search, Wrench, MapPin, ClipboardCheck, HeartPulse, Plus, Printer } from "lucide-react";
import { getAssets, resolveQrContext, createAsset, type Asset } from "@/api/assets";
import { InspectionRunnerModal } from "./components/InspectionRunnerModal";
import AssetHealthRecordDrawer from "./components/AssetHealthRecordDrawer";

const AssetManagementPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrContext, setQrContext] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [selectedAssetForInspection, setSelectedAssetForInspection] = useState<Asset | null>(null);
  const [healthDrawerOpen, setHealthDrawerOpen] = useState(false);
  const [selectedAssetForHealth, setSelectedAssetForHealth] = useState<Asset | null>(null);

  // Thêm thiết bị mới
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm();

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await getAssets();
      if (res?.data) setAssets(res.data);
    } catch (err: any) {
      message.error(err?.message || "Không thể tải danh sách tài sản");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleInspectQr = async (asset: Asset) => {
    setSelectedAsset(asset);
    setQrModalOpen(true);
    try {
      setResolving(true);
      const res = await resolveQrContext(asset.qr_token);
      setQrContext(res?.data || null);
    } catch (err: any) {
      message.error("Lỗi khi giải mã ngữ cảnh QR");
    } finally {
      setResolving(false);
    }
  };

  const handleResolveManualToken = async () => {
    if (!manualToken.trim()) return;
    try {
      setResolving(true);
      const res = await resolveQrContext(manualToken.trim());
      setQrContext(res?.data || null);
      setSelectedAsset(res?.data?.asset || null);
      setQrModalOpen(true);
    } catch (err: any) {
      message.error("Không tìm thấy thiết bị khớp với mã QR này");
    } finally {
      setResolving(false);
    }
  };

  const handleCreateAsset = async () => {
    try {
      const values = await createForm.validateFields();
      setCreating(true);
      const res = await createAsset({
        asset_code: values.asset_code.trim().toUpperCase(),
        name: values.name.trim(),
        location: values.location?.trim() || "Chưa xác định",
        department_id: values.department_id || 4,
      });
      message.success(`Đã thêm thiết bị mới ${values.name} (${values.asset_code}) thành công!`);
      setCreateModalOpen(false);
      createForm.resetFields();
      await fetchAssets();
      if (res?.data) {
        handleInspectQr(res.data);
      }
    } catch (err: any) {
      if (err?.message) {
        message.error(err.message);
      }
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    {
      title: "Mã thiết bị",
      dataIndex: "asset_code",
      key: "asset_code",
      render: (val: string) => <Tag color="blue" className="font-mono font-bold">{val}</Tag>,
    },
    {
      title: "Tên thiết bị / Máy móc",
      key: "name",
      render: (_: any, record: Asset) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{record.name}</div>
          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-gray-400" />
            {record.location || "Chưa xác định vị trí"}
          </div>
        </div>
      ),
    },
    {
      title: "Phòng ban / Xưởng",
      dataIndex: "department_name",
      key: "department_name",
      render: (val: string) => val || "Phân Xưởng Sản Xuất",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (st: string) => (
        <Tag color={st === "OPERATIONAL" ? "green" : st === "FAULTY" ? "red" : "orange"}>
          {st}
        </Tag>
      ),
    },
    {
      title: "Hồ Sơ Sức Khỏe",
      key: "health_score",
      render: (_: any, record: Asset) => {
        const score = record.health_score ?? 100;
        const tagColor = score >= 80 ? "success" : score >= 50 ? "warning" : "error";
        return (
          <div
            className="cursor-pointer group flex items-center gap-2"
            onClick={() => {
              setSelectedAssetForHealth(record);
              setHealthDrawerOpen(true);
            }}
          >
            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'} transition-all`}
                style={{ width: `${score}%` }}
              />
            </div>
            <Tag color={tagColor} className="font-bold font-mono text-xs group-hover:scale-105 transition-transform">
              {score}/100
            </Tag>
          </div>
        );
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      render: (_: any, record: Asset) => (
        <Space size="small">
          <Button
            size="small"
            icon={<QrCode className="w-3.5 h-3.5 inline mr-1" />}
            onClick={() => handleInspectQr(record)}
          >
            Ngữ cảnh QR
          </Button>
          <Button
            size="small"
            type="primary"
            className="bg-indigo-600 hover:bg-indigo-500"
            icon={<ClipboardCheck className="w-3.5 h-3.5 inline mr-1" />}
            onClick={() => {
              setSelectedAssetForInspection(record);
              setInspectionModalOpen(true);
            }}
          >
            Kiểm tra định kỳ
          </Button>
          <Button
            size="small"
            className="border-emerald-500 text-emerald-600 hover:border-emerald-400 hover:text-emerald-500"
            icon={<HeartPulse className="w-3.5 h-3.5 inline mr-1" />}
            onClick={() => {
              setSelectedAssetForHealth(record);
              setHealthDrawerOpen(true);
            }}
          >
            Hồ Sơ Sức Khoẻ
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Asset & QR Context (Quản Lý Thiết Bị & Ngữ Cảnh QR)
            </h1>
            <p className="text-sm text-gray-500">
              Định danh số cho tài sản vật lý, quét QR từ Mobile để kích hoạt Incident và Checklist
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="primary"
            className="bg-indigo-600 hover:bg-indigo-700 font-medium"
            icon={<Plus className="w-4 h-4 inline mr-1" />}
            onClick={() => setCreateModalOpen(true)}
          >
            Thêm thiết bị mới
          </Button>

          <Input
            placeholder="Nhập mã QR token..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="w-52"
          />
          <Button
            icon={<Search className="w-4 h-4 inline mr-1" />}
            onClick={handleResolveManualToken}
            loading={resolving}
          >
            Giải mã
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <Table
          dataSource={assets}
          columns={columns}
          rowKey="asset_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Chưa có thiết bị nào được khai báo." }}
        />
      </div>

      {/* Modal QR Context Viewer */}
      <Modal
        title={`Ngữ Cảnh Số Thiết Bị: ${selectedAsset?.asset_code || ""}`}
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalOpen(false)}>
            Đóng
          </Button>,
        ]}
        width={650}
      >
        <div className="space-y-4 py-2">
          {resolving ? (
            <div className="py-8 text-center text-gray-500">Đang giải mã token...</div>
          ) : qrContext ? (
            <>
              {/* Asset Header Card with Visual QR */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center shrink-0">
                  <QRCode
                    value={qrContext.asset?.qr_token || selectedAsset?.qr_token || ""}
                    size={130}
                    bordered={false}
                  />
                  <span className="text-[10px] text-gray-500 font-mono mt-1 font-bold">
                    {qrContext.asset?.asset_code}
                  </span>
                </div>

                <div className="space-y-2 flex-1 w-full">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-base text-gray-900 dark:text-gray-100">{qrContext.asset?.name}</div>
                    <Tag color="green">{qrContext.asset?.status}</Tag>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" /> {qrContext.asset?.location}
                  </div>
                  <div className="text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-800 break-all">
                    <span className="text-gray-400 font-sans">Mã QR Token:</span> {qrContext.asset?.qr_token}
                  </div>
                  <div className="pt-1">
                    <Button
                      size="small"
                      icon={<Printer className="w-3.5 h-3.5 inline mr-1" />}
                      onClick={() => window.print()}
                    >
                      In tem QR dán lên máy
                    </Button>
                  </div>
                </div>
              </div>

              {/* Open Incidents */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-rose-500" /> Các sự cố đang mở ({qrContext.open_incidents?.length || 0})
                </h4>
                {qrContext.open_incidents?.length > 0 ? (
                  <div className="space-y-2">
                    {qrContext.open_incidents.map((inc: any) => (
                      <div
                        key={inc.incident_id}
                        className="p-3 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-xs space-y-1"
                      >
                        <div className="font-semibold text-red-900 dark:text-red-300">{inc.task_name}</div>
                        <div className="text-gray-600 dark:text-gray-400">{inc.symptom}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Tag color="red">{inc.severity}</Tag>
                          <Tag color={inc.state_color}>{inc.state_name}</Tag>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg">
                    Thiết bị đang hoạt động ổn định, không có sự cố nào chưa xử lý.
                  </div>
                )}
              </div>

              {/* Checklists */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-500" /> Phiếu kiểm tra sẵn có ({qrContext.available_checklists?.length || 0})
                </h4>
                {qrContext.available_checklists?.length > 0 ? (
                  <div className="space-y-2">
                    {qrContext.available_checklists.map((c: any) => (
                      <div
                        key={c.checklist_id}
                        className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-blue-900 dark:text-blue-300">{c.title}</div>
                          <div className="text-gray-500">{c.description || "Phiếu kiểm tra bảo trì định kỳ"}</div>
                        </div>
                        <Tag color="blue">{c.item_count || 5} mục kiểm tra</Tag>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg">
                    Chưa gán checklist riêng cho thiết bị này.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* Inspection Checklist Runner Modal */}
      <InspectionRunnerModal
        open={inspectionModalOpen}
        asset={selectedAssetForInspection}
        onClose={() => setInspectionModalOpen(false)}
        onSuccess={fetchAssets}
      />

      {/* Phase 4 – Asset Health Record Drawer */}
      <AssetHealthRecordDrawer
        open={healthDrawerOpen}
        asset={selectedAssetForHealth}
        onClose={() => setHealthDrawerOpen(false)}
      />

      {/* Modal Khai Báo Thiết Bị Mới */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base">
            <Cpu size={20} /> Khai Báo Máy Móc & Sinh Mã QR Mới
          </div>
        }
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreateAsset}
        confirmLoading={creating}
        okText="Khai báo & Tạo mã QR"
        cancelText="Hủy"
        okButtonProps={{ className: "bg-indigo-600 hover:bg-indigo-700" }}
        width={560}
      >
        <Form form={createForm} layout="vertical" className="pt-2">
          <Form.Item
            name="asset_code"
            label="Mã định danh thiết bị"
            rules={[
              { required: true, message: "Vui lòng nhập mã thiết bị (vd: CNC-025)" },
              { pattern: /^[A-Za-z0-9-_]+$/, message: "Mã máy chỉ gồm chữ cái, số và dấu gạch ngang" },
            ]}
          >
            <Input placeholder="Ví dụ: CNC-025, ROBOT-01, PRESS-10" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Tên máy móc / Thiết bị"
            rules={[{ required: true, message: "Vui lòng nhập tên thiết bị" }]}
          >
            <Input placeholder="Ví dụ: Máy Phay CNC 5 Trục Haas VF-3" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Vị trí lắp đặt / Nhà xưởng"
            rules={[{ required: true, message: "Vui lòng nhập vị trí phân xưởng" }]}
          >
            <Input placeholder="Ví dụ: Phân xưởng Cơ Khí Chính Xác - Khu Vực C2" />
          </Form.Item>

          <Form.Item
            name="department_id"
            label="Phòng ban / Đơn vị quản lý"
            initialValue={4}
          >
            <Select
              options={[
                { value: 4, label: "Phân Xưởng Sản Xuất" },
                { value: 2, label: "Phòng Kỹ Thuật & Bảo Trì" },
                { value: 3, label: "Phòng Quản Lý Chất Lượng" },
                { value: 1, label: "Khối Quản Lý & Điều Hành" },
              ]}
            />
          </Form.Item>

          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
            💡 <strong>Tự động sinh mã QR:</strong> Hệ thống sẽ tự động tạo một mã QR Token bảo mật duy nhất cho thiết bị này. Sau khi tạo, bạn có thể xem và in mã QR để dán trực tiếp lên thân máy.
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AssetManagementPage;
