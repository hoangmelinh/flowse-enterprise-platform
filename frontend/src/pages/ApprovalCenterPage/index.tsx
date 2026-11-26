import React, { useEffect, useState } from "react";
import { Table, Tag, Button, Modal, Input, message, Tabs, Form, Select } from "antd";
import { CheckCircle, XCircle, Clock, ShieldCheck, AlertCircle, Plus, FileText, Lock } from "lucide-react";
import { getPendingApprovals, makeApprovalDecision, type ApprovalItem } from "@/api/approvals";
import { createWorkItem, getMyWork, type WorkItemSummary } from "@/api/workItems";
import { useCapabilities } from "@/hooks/useCapabilities";

const ApprovalCenterPage: React.FC = () => {
  const { capabilities, currentRole } = useCapabilities();
  const canApprove = capabilities.can_approve;

  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [myRequests, setMyRequests] = useState<WorkItemSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [decisionNote, setDecisionNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Request submission modal (Mọi nhân viên đều có thể gửi đề xuất nội bộ)
  const [createRequestOpen, setCreateRequestOpen] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [reqForm] = Form.useForm();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appRes, myWorkRes] = await Promise.all([
        canApprove ? getPendingApprovals().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        getMyWork().catch(() => null),
      ]);
      if (appRes?.data) {
        setApprovals(appRes.data);
      }
      if (myWorkRes?.data?.buckets) {
        const b = myWorkRes.data.buckets;
        const all = [...b.overdue, ...b.today, ...b.in_progress, ...b.waiting, ...b.completed];
        setMyRequests(all.filter((item) => item.type === "REQUEST"));
      }
    } catch (err: any) {
      message.error(err?.message || "Không thể tải dữ liệu phê duyệt & yêu cầu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canApprove]);

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
      fetchData();
    } catch (err: any) {
      if (err?.status === 409) {
        message.warning(err?.message || "Phiếu này đã được người khác xử lý trước đó.");
        setDecisionModalOpen(false);
        fetchData();
      } else {
        message.error(err?.message || "Xử lý thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRequest = async (values: any) => {
    try {
      setCreatingRequest(true);
      await createWorkItem({
        title: values.title,
        description: values.description,
        work_item_type: "REQUEST",
        priority: values.priority || "Normal",
      });
      message.success("Đã gửi đề xuất nội bộ thành công!");
      setCreateRequestOpen(false);
      reqForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err?.message || "Không thể gửi đề xuất");
    } finally {
      setCreatingRequest(false);
    }
  };

  const approvalColumns = [
    {
      title: "Yêu cầu / Work Item",
      key: "task_name",
      render: (_: any, record: ApprovalItem) => (
        <div>
          <div className="font-semibold text-gray-900">{record.task_name}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{record.task_description || "Không có mô tả"}</div>
          {record.incident_id && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Tag color="volcano" className="font-medium">
                Sự cố #{record.incident_id}
              </Tag>
              {(record.asset_name || record.asset_code) && (
                <Tag color="cyan">
                  Máy: {record.asset_name || record.asset_code}
                </Tag>
              )}
            </div>
          )}
          {record.request_note && (
            <div className="text-xs text-amber-800 bg-amber-50 px-2 py-1 rounded mt-1.5 border border-amber-200">
              {record.request_note}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <Tag color={record.work_item_type === "INCIDENT" ? "red" : "blue"}>{record.work_item_type}</Tag>
            <Tag color={record.priority === "Urgent" ? "error" : "default"}>{record.priority}</Tag>
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
            <div className="w-7 h-7 rounded-full bg-[#0058be] text-white flex items-center justify-center text-xs font-semibold">
              {record.requester_name?.charAt(0) || "U"}
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-800">{record.requester_name}</div>
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

  const requestColumns = [
    {
      title: "Tiêu đề đề xuất",
      key: "title",
      render: (_: any, item: WorkItemSummary) => (
        <div>
          <div className="font-semibold text-gray-900">{item.title}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{item.description || "Không có mô tả"}</div>
        </div>
      ),
    },
    {
      title: "Ưu tiên",
      dataIndex: "priority",
      key: "priority",
      render: (p: string) => <Tag color={p === "Urgent" ? "red" : p === "High" ? "orange" : "blue"}>{p}</Tag>,
    },
    {
      title: "Trạng thái",
      key: "state",
      render: (_: any, item: WorkItemSummary) => (
        <Tag color={item.state_color || "blue"}>{item.current_state_name || "Đang xử lý"}</Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      key: "created_at",
      render: (v: string) => <span className="text-xs text-gray-500">{new Date(v).toLocaleString("vi-VN")}</span>,
    },
  ];

  const tabItems = [
    ...(canApprove
      ? [
          {
            key: "pending",
            label: (
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Chờ tôi phê duyệt ({approvals.length})
              </span>
            ),
            children: (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    Các đề xuất cấp phát vật tư, tạm ứng và bước nghiệm thu sự cố đều được kiểm tra phân quyền &amp; chống duyệt trùng (409 Conflict) ở máy chủ.
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <Table
                    dataSource={approvals}
                    columns={approvalColumns}
                    rowKey="approval_id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: "Hiện không có yêu cầu nào chờ bạn phê duyệt." }}
                  />
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      key: "my-requests",
      label: (
        <span className="flex items-center gap-1.5 font-semibold">
          <FileText className="w-4 h-4" />
          Đề xuất nội bộ của tôi ({myRequests.length})
        </span>
      ),
      children: (
        <div className="space-y-4">
          {!canApprove && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <Lock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                Vai trò hiện tại của bạn là <strong className="uppercase">{currentRole}</strong>. Bạn có thể tạo và theo dõi đề xuất của mình; quyền Phê duyệt / Từ chối dành cho Quản lý hoặc Trưởng bộ phận.
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <Table
              dataSource={myRequests}
              columns={requestColumns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              locale={{ emptyText: "Bạn chưa gửi đề xuất nội bộ nào." }}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-[#0058be]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {canApprove ? "Yêu cầu & Trung Tâm Phê Duyệt" : "Đề Xuất & Yêu Cầu Nội Bộ"}
            </h1>
            <p className="text-sm text-gray-500">
              {canApprove
                ? "Phê duyệt đề xuất cấp vật tư, yêu cầu nội bộ và theo dõi các phiếu đã gửi"
                : "Tạo đề xuất cấp thiết bị, vật tư hoặc yêu cầu nội bộ gửi lên Quản lý"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4 inline mr-1" />}
            className="bg-[#0058be]"
            onClick={() => setCreateRequestOpen(true)}
          >
            Tạo đề xuất mới
          </Button>
        </div>
      </div>

      <Tabs defaultActiveKey={canApprove ? "pending" : "my-requests"} items={tabItems} />

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
          <p className="text-sm text-gray-600">
            Bạn đang {decisionType === "APPROVED" ? "phê duyệt" : "từ chối"} yêu cầu:{" "}
            <span className="font-semibold text-gray-900">{selectedItem?.task_name}</span>
          </p>
          {selectedItem?.incident_id && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
              <strong>Liên thông sự cố #{selectedItem.incident_id}:</strong>{" "}
              {decisionType === "APPROVED"
                ? "Hệ thống sẽ tự động chuyển Sự cố về trạng thái Đang khắc phục và bù giờ SLA tương ứng thời gian chờ duyệt."
                : "Hệ thống sẽ kích hoạt lại tiến độ và ghi nhận từ chối cấp linh kiện."}
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

      <Modal
        title="Tạo Đề xuất / Yêu cầu Nội bộ mới"
        open={createRequestOpen}
        onCancel={() => setCreateRequestOpen(false)}
        onOk={() => reqForm.submit()}
        confirmLoading={creatingRequest}
        okText="Gửi đề xuất"
        cancelText="Hủy"
      >
        <Form form={reqForm} layout="vertical" onFinish={handleCreateRequest} initialValues={{ priority: "Normal" }}>
          <Form.Item name="title" label="Tiêu đề đề xuất" rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
            <Input placeholder="Vd: Xin cấp laptop cho nhân sự mới, Tạm ứng công tác..." />
          </Form.Item>
          <Form.Item name="priority" label="Mức độ ưu tiên">
            <Select>
              <Select.Option value="Low">Thấp (Low)</Select.Option>
              <Select.Option value="Normal">Bình thường (Normal)</Select.Option>
              <Select.Option value="High">Cao (High)</Select.Option>
              <Select.Option value="Urgent">Khẩn cấp (Urgent)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Nội dung chi tiết & Lý do">
            <Input.TextArea rows={3} placeholder="Nhập thông số, chi phí dự kiến, thời hạn cần..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ApprovalCenterPage;
