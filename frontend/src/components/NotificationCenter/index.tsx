import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Popover,
  Badge,
  Button,
  Tabs,
  Tag,
  notification as antNotification,
  message,
  Tooltip,
  Modal,
  Input,
} from "antd";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  Package,
  CheckCircle2,
  Mail,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  testBrevoEmailApi,
} from "@/api/notifications";
import type { NotificationData } from "@/store/modules/notifications";

export const NotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [testEmailModal, setTestEmailModal] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const notifiedIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef(true);

  const navigate = useNavigate();

  // Fetch notifications from server
  const fetchNotifs = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await getNotifications({ limit: 40 });
      if (res?.notifications) {
        const list = res.notifications;
        setNotifications(list);
        setUnreadCount(res.unreadCount || 0);

        if (isInitialLoadRef.current) {
          // Lần đầu tải trang: Nạp toàn bộ ID vào Set để KHÔNG nổ Toast hàng loạt gây rác màn hình
          list.forEach((n) => notifiedIdsRef.current.add(n.notification_id));
          isInitialLoadRef.current = false;
        } else {
          // Chỉ nổ Toast cho thông báo MỚI phát sinh trong khi đang mở tab (polling nền)
          const newAlerts = list.filter(
            (n) =>
              !n.is_read &&
              (n.priority === "URGENT" || n.priority === "HIGH") &&
              !notifiedIdsRef.current.has(n.notification_id)
          );

          if (newAlerts.length > 0) {
            newAlerts.forEach((n) => notifiedIdsRef.current.add(n.notification_id));
            const latest = newAlerts[0];
            antNotification.warning({
              message: (
                <div className="flex items-center gap-1.5 font-bold text-rose-600">
                  <ShieldAlert size={18} />
                  {newAlerts.length > 1
                    ? `CÓ ${newAlerts.length} CẢNH BÁO MỚI PHÁT SINH`
                    : latest.priority === "URGENT"
                    ? "BÁO ĐỘNG ĐỎ VỠ SLA"
                    : "CẢNH BÁO SẮP HẾT HẠN"}
                </div>
              ),
              description: (
                <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                  {newAlerts.length > 1
                    ? `${latest.content} (và ${newAlerts.length - 1} thông báo khác)`
                    : latest.content}
                </div>
              ),
              duration: 4,
              placement: "topRight",
            });
          }
        }
      }
    } catch (err: any) {
      // Bỏ qua lỗi token hết hạn khi chưa đăng nhập
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // Polling chu kỳ 30 giây để cập nhật trạng thái thời gian thực
  useEffect(() => {
    fetchNotifs(false);
    const interval = setInterval(() => {
      fetchNotifs(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      message.error("Lỗi khi đánh dấu thông báo");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      message.success("Đã đánh dấu tất cả thông báo là đã đọc");
    } catch (err: any) {
      message.error("Lỗi khi thao tác");
    }
  };

  const handleClickItem = async (n: NotificationData) => {
    if (!n.is_read) {
      await markNotificationAsRead(n.notification_id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) =>
          item.notification_id === n.notification_id ? { ...item, is_read: true } : item
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);

    // Điều hướng theo ngữ cảnh thông báo
    if (n.entity_type === "INCIDENT" || n.type.includes("SLA") || n.type.includes("INCIDENT")) {
      navigate("/incidents");
    } else if (n.entity_type === "REQUEST" || n.type.includes("PARTS")) {
      navigate("/approvals");
    } else {
      navigate("/home");
    }
  };

  const handleSendTestBrevo = async () => {
    try {
      setSendingTestEmail(true);
      const res = await testBrevoEmailApi(testEmailInput.trim() || undefined);
      message.success(res?.message || "Đã gửi email thử nghiệm thành công!");
      setTestEmailModal(false);
      setTestEmailInput("");
    } catch (err: any) {
      message.error(err?.response?.data?.error || err?.message || "Lỗi gửi mail thử nghiệm");
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Lọc thông báo theo tabs
  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    if (activeTab === "sla") {
      return notifications.filter(
        (n) => n.priority === "URGENT" || n.priority === "HIGH" || n.type.includes("SLA")
      );
    }
    return notifications;
  }, [notifications, activeTab]);

  const renderIcon = (n: NotificationData) => {
    if (n.priority === "URGENT" || n.type === "SLA_BREACHED") {
      return (
        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} />
        </div>
      );
    }
    if (n.priority === "HIGH" || n.type === "SLA_AT_RISK") {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
          <Clock size={16} />
        </div>
      );
    }
    if (n.type === "PARTS_REQUESTED") {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Package size={16} />
        </div>
      );
    }
    if (n.type === "PARTS_APPROVED") {
      return (
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 size={16} />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
        <Bell size={16} />
      </div>
    );
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return "Vừa xong";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      return d.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const popoverContent = (
    <div className="w-[380px] sm:w-[420px] max-w-[90vw] -m-3">
      {/* Header */}
      <div className="p-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 m-0">
            Trung Tâm Thông Báo
          </h3>
          {unreadCount > 0 && (
            <Tag color="red" className="rounded-full text-[11px] px-2 font-mono">
              {unreadCount} chưa đọc
            </Tag>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Tooltip title="Đánh dấu tất cả đã đọc">
              <Button
                type="text"
                size="small"
                icon={<CheckCheck size={14} className="text-gray-500 hover:text-blue-600" />}
                onClick={handleMarkAllRead}
              />
            </Tooltip>
          )}
          <Tooltip title="Thử nghiệm gửi email Brevo">
            <Button
              type="text"
              size="small"
              icon={<Mail size={14} className="text-gray-500 hover:text-emerald-600" />}
              onClick={() => setTestEmailModal(true)}
            />
          </Tooltip>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-1 border-b border-gray-100 dark:border-gray-800">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          items={[
            { key: "all", label: `Tất cả (${notifications.length})` },
            { key: "unread", label: `Chưa đọc (${unreadCount})` },
            {
              key: "sla",
              label: (
                <span className="flex items-center gap-1 text-rose-600">
                  <ShieldAlert size={12} /> Báo động SLA
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Đang tải thông báo...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
            <Bell size={24} className="text-gray-300 dark:text-gray-700" />
            <span>Không có thông báo nào trong mục này</span>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.notification_id}
              onClick={() => handleClickItem(item)}
              className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                !item.is_read
                  ? "bg-blue-50/40 dark:bg-blue-950/20"
                  : "bg-white dark:bg-gray-900"
              }`}
            >
              {renderIcon(item)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.priority === "URGENT" && (
                      <Tag color="red" className="text-[10px] m-0 font-bold">
                        KHẨN CẤP
                      </Tag>
                    )}
                    {item.priority === "HIGH" && (
                      <Tag color="orange" className="text-[10px] m-0 font-bold">
                        ƯU TIÊN CAO
                      </Tag>
                    )}
                    <span className="text-[11px] text-gray-400 font-mono">
                      {formatTime(item.created_at)}
                    </span>
                  </div>
                  {!item.is_read && (
                    <Tooltip title="Đánh dấu đã đọc">
                      <button
                        onClick={(e) => handleMarkAsRead(e, item.notification_id)}
                        className="text-gray-400 hover:text-blue-600 p-0.5 rounded"
                      >
                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                      </button>
                    </Tooltip>
                  )}
                </div>
                <div
                  className={`text-xs leading-relaxed line-clamp-2 ${
                    !item.is_read
                      ? "font-semibold text-gray-900 dark:text-gray-100"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {item.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800 text-center bg-gray-50/30 dark:bg-gray-900/30">
        <Button
          type="link"
          size="small"
          className="text-xs text-blue-600"
          onClick={() => {
            setOpen(false);
            navigate("/home");
          }}
        >
          Xem tất cả công việc & sự cố <ExternalLink size={12} className="inline ml-1" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Popover
        content={popoverContent}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
        overlayClassName="notification-center-popover"
      >
        <button
          type="button"
          className="relative flex items-center justify-center p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-none bg-transparent"
          title="Thông báo hệ thống"
        >
          <Badge count={unreadCount} overflowCount={99} size="small" offset={[2, -2]}>
            <Bell size={18} />
          </Badge>
        </button>
      </Popover>

      {/* Modal Kiểm thử cấu hình gửi Brevo Email */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <Mail size={18} />
            <span>Thử Nghiệm Gửi Email Qua Brevo</span>
          </div>
        }
        open={testEmailModal}
        onCancel={() => setTestEmailModal(false)}
        onOk={handleSendTestBrevo}
        confirmLoading={sendingTestEmail}
        okText="Gửi Email Thử Nghiệm"
        cancelText="Hủy"
      >
        <div className="space-y-3 py-2 text-xs text-gray-600 dark:text-gray-300">
          <p>
            Nhập địa chỉ email để kiểm tra kết nối với <strong>Brevo Email Service</strong>. Hệ thống sẽ gửi một mẫu email thông báo kích hoạt đến hòm thư này.
          </p>
          <div>
            <label className="font-semibold block mb-1 text-gray-700 dark:text-gray-200">
              Email nhận thử nghiệm:
            </label>
            <Input
              placeholder="VD: clytusnguyen@gmail.com"
              value={testEmailInput}
              onChange={(e) => setTestEmailInput(e.target.value)}
            />
          </div>
          <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            💡 Lưu ý: Nếu biến <code>BREVO_API_KEY</code> trong <code>backend/.env</code> chưa được điền, hệ thống sẽ in log mô phỏng (Mock mode) vào console mà không báo lỗi.
          </div>
        </div>
      </Modal>
    </>
  );
};

export default NotificationCenter;
