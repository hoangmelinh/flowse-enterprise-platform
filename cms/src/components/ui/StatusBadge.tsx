import React from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    MinusCircle,
    PauseCircle,
    Shield,
    Wrench,
    XCircle,
} from 'lucide-react';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusConfig {
    label: string;
    tone: StatusTone;
    icon: React.ReactNode;
}

const STATUS_MAP: Record<string, StatusConfig> = {
    OPERATIONAL: { label: 'Đang hoạt động', tone: 'success', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
    MAINTENANCE: { label: 'Đang bảo trì', tone: 'warning', icon: <Wrench size={12} aria-hidden="true" /> },
    FAULTY: { label: 'Gặp sự cố', tone: 'danger', icon: <AlertTriangle size={12} aria-hidden="true" /> },
    DECOMMISSIONED: { label: 'Ngưng sử dụng', tone: 'neutral', icon: <MinusCircle size={12} aria-hidden="true" /> },
    IN_SLA: { label: 'Đúng SLA', tone: 'success', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
    COMPLETED: { label: 'Hoàn tất SLA', tone: 'info', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
    AT_RISK: { label: 'Sắp quá hạn SLA', tone: 'warning', icon: <Clock size={12} aria-hidden="true" /> },
    BREACHED: { label: 'Quá hạn SLA', tone: 'danger', icon: <XCircle size={12} aria-hidden="true" /> },
    PAUSED: { label: 'Tạm dừng SLA', tone: 'neutral', icon: <PauseCircle size={12} aria-hidden="true" /> },
    PASS: { label: 'Đạt (PASS)', tone: 'success', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
    FAIL: { label: 'Không đạt (FAIL)', tone: 'danger', icon: <XCircle size={12} aria-hidden="true" /> },
    APPLIED: { label: 'Đã đồng bộ', tone: 'success', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
    CONFLICT: { label: 'Xung đột', tone: 'danger', icon: <AlertTriangle size={12} aria-hidden="true" /> },
    REJECTED: { label: 'Từ chối', tone: 'danger', icon: <XCircle size={12} aria-hidden="true" /> },
    ADMIN: { label: 'Admin', tone: 'info', icon: <Shield size={12} aria-hidden="true" /> },
    MANAGER: { label: 'Manager', tone: 'warning', icon: <Shield size={12} aria-hidden="true" /> },
    MEMBER: { label: 'Member', tone: 'neutral', icon: <MinusCircle size={12} aria-hidden="true" /> },
    ACTIVE: { label: 'Hoạt động', tone: 'success', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
    INACTIVE: { label: 'Đã khóa', tone: 'danger', icon: <XCircle size={12} aria-hidden="true" /> },
    PENDING: { label: 'Chờ xác nhận', tone: 'warning', icon: <Clock size={12} aria-hidden="true" /> },
    ACCEPTED: { label: 'Đã tham gia', tone: 'success', icon: <CheckCircle2 size={12} aria-hidden="true" /> },
    IN_PROGRESS: { label: 'Đang thực hiện', tone: 'info', icon: <Clock size={12} aria-hidden="true" /> },
    PROCESSING: { label: 'Đang xử lý', tone: 'info', icon: <Clock size={12} aria-hidden="true" /> },
    CRITICAL: { label: 'Khẩn cấp (CRITICAL)', tone: 'danger', icon: <AlertTriangle size={12} aria-hidden="true" /> },
    HIGH: { label: 'Cao (HIGH)', tone: 'warning', icon: <AlertTriangle size={12} aria-hidden="true" /> },
    MEDIUM: { label: 'Trung bình', tone: 'info', icon: <Clock size={12} aria-hidden="true" /> },
    LOW: { label: 'Thấp', tone: 'neutral', icon: <MinusCircle size={12} aria-hidden="true" /> },
    SYSTEM: { label: 'Hệ thống (Chỉ đọc)', tone: 'neutral', icon: <Shield size={12} aria-hidden="true" /> },
};

const TONE_CLASSES: Record<StatusTone, string> = {
    success: 'border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)]',
    warning: 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
    danger: 'border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]',
    info: 'border-[var(--status-info-border)] bg-[var(--status-info-bg)] text-[var(--status-info)]',
    neutral: 'border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]',
};

export const StatusBadge: React.FC<{ value?: string | null; labelOverride?: string }> = ({
    value,
    labelOverride,
}) => {
    const key = String(value || '').toUpperCase();
    const cfg = STATUS_MAP[key] || {
        label: value || 'Không xác định',
        tone: 'neutral' as StatusTone,
        icon: <MinusCircle size={12} aria-hidden="true" />,
    };

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONE_CLASSES[cfg.tone]}`}
        >
            {cfg.icon}
            <span>{labelOverride || cfg.label}</span>
        </span>
    );
};
