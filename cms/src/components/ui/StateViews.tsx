import React from 'react';
import { Button, Empty, Skeleton } from 'antd';
import { AlertCircle, Inbox, RefreshCw, ShieldAlert } from 'lucide-react';

export const LoadingState: React.FC<{ rows?: number; label?: string }> = ({
    rows = 4,
    label = 'Đang tải dữ liệu...',
}) => (
    <div className="cms-panel p-5" role="status" aria-live="polite" aria-label={label}>
        <Skeleton active paragraph={{ rows }} />
    </div>
);

export const EmptyState: React.FC<{
    title: string;
    description?: string;
    action?: React.ReactNode;
    embedded?: boolean;
}> = ({ title, description, action, embedded = false }) => (
    <div className={`${embedded ? 'py-6' : 'cms-panel p-8'} flex flex-col items-center justify-center text-center`}>
        <Empty
            image={<Inbox size={36} className="mx-auto text-slate-300" aria-hidden="true" />}
            description={
                <div className="mt-1 space-y-1">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
                    {description && <div className="text-xs text-[var(--text-muted)]">{description}</div>}
                </div>
            }
        >
            {action}
        </Empty>
    </div>
);

export const ErrorState: React.FC<{
    title?: string;
    message: string;
    onRetry?: () => void;
}> = ({ title = 'Không thể tải dữ liệu', message, onRetry }) => (
    <div
        role="alert"
        className="cms-panel flex flex-col items-center justify-center border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]/40 p-6 text-center"
    >
        <AlertCircle size={28} className="mb-2 text-[var(--status-danger)]" aria-hidden="true" />
        <h3 className="m-0 text-sm font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-1 mb-0 max-w-md text-xs text-[var(--text-secondary)]">{message}</p>
        {onRetry && (
            <Button size="small" icon={<RefreshCw size={13} />} onClick={onRetry} className="mt-3">
                Thử lại
            </Button>
        )}
    </div>
);

export const PermissionDeniedState: React.FC<{
    title?: string;
    description: string;
    action?: React.ReactNode;
}> = ({ title = 'Giới hạn quyền hạn', description, action }) => (
    <div
        role="status"
        className="cms-panel flex flex-col items-center justify-center border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]/40 p-6 text-center"
    >
        <ShieldAlert size={26} className="mb-2 text-[var(--status-warning)]" aria-hidden="true" />
        <h3 className="m-0 text-sm font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-1 mb-0 max-w-lg text-[13px] text-[var(--text-secondary)]">{description}</p>
        {action && <div className="mt-3">{action}</div>}
    </div>
);
