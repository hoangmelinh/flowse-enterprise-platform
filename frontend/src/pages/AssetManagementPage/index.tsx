import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Input, Modal, message } from "antd";
import { Cpu, QrCode, Search, Wrench, MapPin } from "lucide-react";
import { getAssets, resolveQrContext, type Asset } from "@/api/assets";

const AssetManagementPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrContext, setQrContext] = useState<any>(null);
  const [resolving, setResolving] = useState(false);
  const [manualToken, setManualToken] = useState("");

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
      title: "QR Context",
      key: "qr",
      render: (_: any, record: Asset) => (
        <Button
          size="small"
          icon={<QrCode className="w-3.5 h-3.5 inline mr-1" />}
          onClick={() => handleInspectQr(record)}
        >
          Xem Ngữ cảnh QR
        </Button>
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

        {/* QR Token Resolver Bar */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Nhập mã QR token để giải mã..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="w-64"
          />
          <Button
            type="primary"
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
              {/* Asset Header Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base text-gray-900 dark:text-gray-100">{qrContext.asset?.name}</div>
                  <Tag color="green">{qrContext.asset?.status}</Tag>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {qrContext.asset?.location}
                </div>
                <div className="text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-800">
                  <span className="text-gray-400 font-sans">Mã QR Token:</span> {qrContext.asset?.qr_token}
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
    </div>
  );
};

export default AssetManagementPage;
