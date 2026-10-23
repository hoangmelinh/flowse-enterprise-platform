import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Modal, Input, message } from "antd";
import { CheckCircle, XCircle, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { getPendingApprovals, makeApprovalDecision, type ApprovalItem } from "@/api/approvals";

const ApprovalCenterPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [decisionNote, setDecisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await getPendingApprovals();
      if (res?.data) {
        setApprovals(res.data);
      }
    } catch (err: any) {
      message.error(err?.message || "Không thể tải danh sách phê duyệt");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleOpenDecision = (item: ApprovalItem, type: "APPROVED" | "REJECTED") => {
    setSelectedItem(item);
    setDecisionType(type);
    setDecisionNote("");
    setDecisionModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      await makeApprovalDecision(selectedItem.approval_id, {
        status: decisionType,
        decisionNote,
      });
      message.success(
        decisionType === "APPROVED" ? "Đã phê duyệt yêu cầu thành công" : "Đã từ chối yêu cầu"
      );
      setDecisionModalOpen(false);
      fetchApprovals();
    } catch (err: any) {
      message.error(err?.message || "Xử lý thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Yêu cầu / Work Item",
      key: "task_name",
      render: (_: any, record: ApprovalItem) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100">{record.task_name}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{record.task_description || "Không có mô tả"}</div>
          
          {record.incident_id && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Tag color="volcano" className="font-medium">
                🔗 Sự cố #{record.incident_id}
              </Tag>
              {(record.asset_name || record.asset_code) && (
                <Tag color="cyan">
                  Máy: {record.asset_name || record.asset_code}
                </Tag>
              )}
            </div>
          )}

          {record.request_note && (
            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded mt-1.5 border border-amber-200 dark:border-amber-900/30">
              📝 {record.request_note}
            </div>
          )}

          <div className="mt-1 flex items-center gap-1.5">
            <Tag color={record.work_item_type === "INCIDENT" ? "red" : "blue"}>
              {record.work_item_type}
            </Tag>
            <Tag color={record.priority === "Urgent" ? "error" : "default"}>
              {record.priority}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Người đề xuất",
      key: "requester",
      render: (_: any, record: ApprovalItem) => (
        <div className="flex items-center gap-2">
          {record.requester_avatar ? (
            <img src={record.requester_avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-semibold">
              {record.requester_name?.charAt(0) || "U"}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{record.requester_name}</div>
            <div className="text-xs text-gray-400">{record.requester_email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Thời gian gửi",
      dataIndex: "created_at",
      key: "created_at",
      render: (val: string) => (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {new Date(val).toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: ApprovalItem) => (
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            size="small"
            icon={<CheckCircle className="w-3.5 h-3.5 inline mr-1" />}
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleOpenDecision(record, "APPROVED")}
          >
            Duyệt
          </Button>
          <Button
            danger
            size="small"
            icon={<XCircle className="w-3.5 h-3.5 inline mr-1" />}
            onClick={() => handleOpenDecision(record, "REJECTED")}
          >
            Từ chối
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                Approval Center (Trung Tâm Phê Duyệt)
              </h1>
              <p className="text-sm text-gray-500">
                Quản lý các yêu cầu công việc, đề xuất và sự cố đang chờ cấp thẩm quyền phê duyệt
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchApprovals} loading={loading}>
            Làm mới
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          Các bước chuyển trạng thái nhạy cảm (Sự cố nghiêm trọng, Mua sắm linh kiện, Hoàn tất bảo trì) cần có sự xác nhận của Quản lý trước khi được chuyển tiếp trong quy trình.
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <Table
          dataSource={approvals}
          columns={columns}
          rowKey="approval_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: "Hiện không có yêu cầu nào chờ bạn phê duyệt." }}
        />
      </div>

      {/* Decision Modal */}
      <Modal
        title={decisionType === "APPROVED" ? "Xác nhận Phê duyệt" : "Xác nhận Từ chối"}
        open={decisionModalOpen}
        onCancel={() => setDecisionModalOpen(false)}
        onOk={handleConfirmDecision}
        confirmLoading={submitting}
        okText={decisionType === "APPROVED" ? "Phê duyệt" : "Từ chối"}
        okButtonProps={{
          danger: decisionType === "REJECTED",
          className: decisionType === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : "",
        }}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Bạn đang {decisionType === "APPROVED" ? "phê duyệt" : "từ chối"} yêu cầu:{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {selectedItem?.task_name}
            </span>
          </p>

          {selectedItem?.incident_id && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <span className="text-base leading-none">⚡</span>
              <div>
                <strong>Liên thông sự cố #{selectedItem.incident_id}:</strong> Khi bấm{" "}
                <span className="underline font-semibold">{decisionType === "APPROVED" ? "Phê duyệt" : "Từ chối"}</span>, hệ thống sẽ{" "}
                {decisionType === "APPROVED" ? "tự động chuyển Sự cố về trạng thái Đang khắc phục và dời hạn chót SLA tương ứng số phút đã chờ duyệt." : "kích hoạt lại tiến độ và ghi nhận từ chối linh kiện."}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Ghi chú quyết định (tùy chọn)
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Nhập lý do hoặc chỉ đạo thêm..."
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ApprovalCenterPage;
