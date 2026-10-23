import React, { useState } from "react";
import { Modal, Form, Input, InputNumber, message } from "antd";
import { Wrench, ShieldAlert } from "lucide-react";
import { requestSpareParts, type IncidentItem } from "@/api/incidents";

interface RequestPartsModalProps {
  open: boolean;
  incident: IncidentItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestPartsModal: React.FC<RequestPartsModalProps> = ({
  open,
  incident,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    if (!incident) return;
    try {
      setSubmitting(true);
      await requestSpareParts(incident.incident_id, {
        partName: values.partName,
        quantity: values.quantity,
        reason: values.reason,
      });
      message.success(
        "Đã gửi đề xuất xin cấp linh kiện lên Trung tâm phê duyệt (Approval Center) và tạm dừng SLA!"
      );
      form.resetFields();
      onClose();
      onSuccess();
    } catch (err: any) {
      message.error(err?.message || "Không thể gửi yêu cầu linh kiện");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      zIndex={3000}
      getContainer={() => document.body}
      title={
        <div className="flex items-center gap-2">
          <Wrench size={18} className="text-amber-600" />
          <span>Yêu cầu cấp phát linh kiện / vật tư thay thế</span>
        </div>
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={submitting}
      okText="Gửi đề xuất phê duyệt"
      cancelText="Hủy bỏ"
    >
      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-xs text-amber-800 flex items-start gap-2">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          Khi gửi yêu cầu, Sự cố <strong>#{incident?.incident_id}</strong> (Máy: {incident?.asset_code}) sẽ tự động chuyển sang trạng thái <strong>ON_HOLD_PENDING_PARTS</strong> và <strong>Đồng hồ tính giờ SLA sẽ được tạm dừng</strong> để bảo vệ KPI kỹ thuật viên cho tới khi quản lý duyệt cấp vật tư.
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ quantity: 1 }}
      >
        <Form.Item
          label="Tên linh kiện / Vật tư cần thay"
          name="partName"
          rules={[{ required: true, message: "Vui lòng nhập tên linh kiện!" }]}
        >
          <Input placeholder="Ví dụ: Vòng bi trục chính SKF-6205, Dầu thủy lực ISO VG 46..." />
        </Form.Item>

        <Form.Item
          label="Số lượng"
          name="quantity"
          rules={[{ required: true, message: "Vui lòng nhập số lượng!" }]}
        >
          <InputNumber min={1} max={100} className="w-full" />
        </Form.Item>

        <Form.Item
          label="Lý do cấp bách & Tình trạng hỏng hóc"
          name="reason"
          rules={[{ required: true, message: "Vui lòng mô tả lý do xin vật tư!" }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Mô tả linh kiện cũ bị cháy, rạn nứt hoặc mòn không thể khắc phục..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default RequestPartsModal;
