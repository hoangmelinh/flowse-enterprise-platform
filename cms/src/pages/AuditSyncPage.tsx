import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Select, Tabs, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Eye, RefreshCw, Smartphone } from 'lucide-react';
import {
    getSyncLogs,
    getWorkspaceActivities,
    type AuditActivityItem,
    type SyncLogItem,
} from '@/api/cmsApi';
import { useCmsAuth } from '@/context/CmsAuthContext';
import { getApiErrorMessage } from '@/utils/error';
import {
    DataTable,
    EmptyState,
    ErrorState,
    FilterBar,
    LoadingState,
    PageHeader,
    SideDrawer,
    StatusBadge,
} from '@/components/ui';

function sanitizeAuditPayload(val: unknown): string {
    if (val === null || val === undefined) return 'Không có dữ liệu';
    try {
        return JSON.stringify(val, null, 2);
    } catch {
        return String(val);
    }
}

export default function AuditSyncPage() {
    const { currentWorkspaceId, currentRole, isAdmin } = useCmsAuth();
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activities, setActivities] = useState<AuditActivityItem[]>([]);
    const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);
    const [searchText, setSearchText] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [syncStatusFilter, setSyncStatusFilter] = useState<string>('ALL');

    const [selectedActivity, setSelectedActivity] = useState<AuditActivityItem | null>(null);
    const [selectedSync, setSelectedSync] = useState<SyncLogItem | null>(null);

    const loadData = useCallback(async () => {
        if (!currentWorkspaceId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setErrorMsg(null);
            const [actRes, syncRes] = await Promise.all([
                getWorkspaceActivities(currentWorkspaceId, {
                    work_item_type: typeFilter || undefined,
                    search: searchText.trim() || undefined,
                }),
                getSyncLogs(currentWorkspaceId),
            ]);
            setActivities(actRes?.data || []);
            setSyncLogs(syncRes?.data || []);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Không thể tải nhật ký kiểm toán & đồng bộ');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentWorkspaceId, typeFilter, searchText]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredSyncLogs = useMemo(() => {
        if (syncStatusFilter === 'ALL') return syncLogs;
        return syncLogs.filter((s) => s.status === syncStatusFilter);
    }, [syncLogs, syncStatusFilter]);

    const activityColumns: ColumnsType<AuditActivityItem> = [
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 165,
            sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: (d: string) => <span className="tabular-nums text-xs">{dayjs(d).format('DD/MM/YYYY HH:mm:ss')}</span>,
        },
        {
            title: 'Người thực hiện',
            key: 'actor',
            render: (_, r) => (
                <span className="font-semibold text-[var(--text-primary)]">
                    {r.user_name || r.username || 'Hệ thống'}
                </span>
            ),
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_, r) => <Tag color="blue" className="m-0">{r.action_label || r.action}</Tag>,
        },
        {
            title: 'Đầu việc',
            key: 'task',
            render: (_, r) => (
                <div className="flex flex-wrap items-center gap-1.5">
                    <Tag className="m-0">{r.work_item_type || 'TASK'}</Tag>
                    <span className="font-medium text-[var(--text-primary)]">
                        #{r.task_id} — {r.task_name}
                    </span>
                </div>
            ),
        },
        {
            title: 'Chi tiết',
            key: 'inspect',
            align: 'right',
            width: 100,
            render: (_, r) => (
                <Button size="small" icon={<Eye size={12} />} onClick={() => setSelectedActivity(r)}>
                    Xem
                </Button>
            ),
        },
    ];

    const syncColumns: ColumnsType<SyncLogItem> = [
        {
            title: 'Thời điểm đồng bộ',
            dataIndex: 'applied_at',
            key: 'applied_at',
            width: 165,
            render: (d: string) => <span className="tabular-nums text-xs">{dayjs(d).format('DD/MM/YYYY HH:mm:ss')}</span>,
        },
        {
            title: 'Nhân sự hiện trường',
            key: 'user',
            render: (_, r) => (
                <div className="text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">{r.user_name || `#${r.user_id}`}</div>
                    <div className="text-[var(--text-muted)]">{r.user_email}</div>
                </div>
            ),
        },
        {
            title: 'Loại tác vụ',
            dataIndex: 'action_type',
            key: 'action_type',
            render: (t: string) => <span className="font-mono-code text-xs font-semibold">{t}</span>,
        },
        {
            title: 'Version',
            key: 'version',
            render: (_, r) => (
                <span className="font-mono-code text-xs text-[var(--text-secondary)]">
                    base {r.base_version ?? '-'} → srv {r.server_version ?? '-'}
                </span>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (st: string) => <StatusBadge value={st} />,
        },
        {
            title: 'Chi tiết',
            key: 'detail',
            align: 'right',
            width: 100,
            render: (_, r) => (
                <Button size="small" icon={<Eye size={12} />} onClick={() => setSelectedSync(r)}>
                    Xem
                </Button>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Nhật ký Kiểm toán & Đồng bộ Mobile"
                description="Truy vết lịch sử thay đổi đầu việc và giám sát hàng đợi đồng bộ ngoại tuyến từ hiện trường."
                meta={<StatusBadge value={currentRole} />}
                actions={
                    <Button icon={<RefreshCw size={14} />} onClick={loadData} loading={loading}>
                        Làm mới
                    </Button>
                }
            />

            <Alert
                type="info"
                showIcon
                className="mb-4"
                title="Nhật ký bất biến (Chỉ đọc)"
                description={
                    isAdmin
                        ? 'Dữ liệu nhật ký kiểm toán được lưu theo trật tự thời gian và không cho phép chỉnh sửa từ giao diện.'
                        : 'Bạn đang xem nhật ký giới hạn trong phạm vi phòng ban/phân xưởng được giao quản lý.'
                }
            />

            {!currentWorkspaceId ? (
                <EmptyState title="Chưa chọn Workspace" description="Vui lòng chọn Workspace ở thanh tiêu đề." />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadData} />
            ) : (
                <div className="cms-panel p-4 sm:p-5">
                    <Tabs
                        items={[
                            {
                                key: 'audit',
                                label: `Nhật ký Hoạt động (${activities.length})`,
                                children: (
                                    <div className="space-y-4">
                                        <FilterBar
                                            className="mb-2 border-none bg-[var(--surface-subtle)]"
                                            left={
                                                <>
                                                    <Input.Search
                                                        allowClear
                                                        placeholder="Tìm tên đầu việc, người thao tác hoặc hành động..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        onSearch={loadData}
                                                        className="w-64 sm:w-80"
                                                    />
                                                    <Select
                                                        aria-label="Lọc loại đầu việc"
                                                        value={typeFilter}
                                                        onChange={setTypeFilter}
                                                        className="w-44"
                                                        options={[
                                                            { label: 'Mọi loại việc', value: '' },
                                                            { label: 'TASK', value: 'TASK' },
                                                            { label: 'INCIDENT', value: 'INCIDENT' },
                                                            { label: 'REQUEST', value: 'REQUEST' },
                                                            { label: 'INSPECTION', value: 'INSPECTION' },
                                                        ]}
                                                    />
                                                </>
                                            }
                                            right={
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    {activities.length} bản ghi gần nhất
                                                </span>
                                            }
                                        />
                                        {loading ? (
                                            <LoadingState rows={5} />
                                        ) : activities.length === 0 ? (
                                            <EmptyState embedded title="Chưa ghi nhận nhật ký hoạt động phù hợp bộ lọc" />
                                        ) : (
                                            <DataTable
                                                rowKey="activity_id"
                                                dataSource={activities}
                                                columns={activityColumns}
                                                pagination={{ pageSize: 15 }}
                                            />
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'sync',
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Smartphone size={14} aria-hidden="true" /> Nhật ký Đồng bộ Mobile ({syncLogs.length})
                                    </span>
                                ),
                                children: (
                                    <div className="space-y-4">
                                        <FilterBar
                                            className="mb-2 border-none bg-[var(--surface-subtle)]"
                                            left={
                                                <Select
                                                    aria-label="Lọc trạng thái đồng bộ"
                                                    value={syncStatusFilter}
                                                    onChange={setSyncStatusFilter}
                                                    className="w-48"
                                                    options={[
                                                        { label: 'Mọi trạng thái đồng bộ', value: 'ALL' },
                                                        { label: 'Đã đồng bộ (APPLIED)', value: 'APPLIED' },
                                                        { label: 'Xung đột (CONFLICT)', value: 'CONFLICT' },
                                                        { label: 'Từ chối (REJECTED)', value: 'REJECTED' },
                                                        { label: 'Đang xử lý (PROCESSING)', value: 'PROCESSING' },
                                                    ]}
                                                />
                                            }
                                            right={
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    Hiển thị {filteredSyncLogs.length}/{syncLogs.length} tác vụ đồng bộ
                                                </span>
                                            }
                                        />
                                        {loading ? (
                                            <LoadingState rows={5} />
                                        ) : filteredSyncLogs.length === 0 ? (
                                            <EmptyState embedded title="Không có nhật ký đồng bộ phù hợp bộ lọc" />
                                        ) : (
                                            <DataTable
                                                rowKey="sync_id"
                                                dataSource={filteredSyncLogs}
                                                columns={syncColumns}
                                                pagination={{ pageSize: 15 }}
                                            />
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            <SideDrawer
                title={selectedActivity ? `Chi tiết nhật ký #${selectedActivity.activity_id}` : 'Chi tiết nhật ký'}
                open={Boolean(selectedActivity)}
                onClose={() => setSelectedActivity(null)}
            >
                {selectedActivity && (
                    <div className="space-y-4 text-[13px]">
                        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3.5 space-y-1.5">
                            <div><strong>Người thực hiện:</strong> {selectedActivity.user_name || selectedActivity.username || 'Hệ thống'}</div>
                            <div><strong>Hành động:</strong> {selectedActivity.action_label || selectedActivity.action}</div>
                            <div><strong>Đầu việc:</strong> #{selectedActivity.task_id} — {selectedActivity.task_name}</div>
                            <div><strong>Thời gian:</strong> {dayjs(selectedActivity.created_at).format('DD/MM/YYYY HH:mm:ss')}</div>
                        </div>
                        <div>
                            <div className="mb-1 text-xs font-bold text-[var(--text-secondary)]">Giá trị trước (old_value)</div>
                            <pre className="m-0 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 font-mono-code text-xs">
                                {sanitizeAuditPayload(selectedActivity.old_value)}
                            </pre>
                        </div>
                        <div>
                            <div className="mb-1 text-xs font-bold text-[var(--text-secondary)]">Giá trị sau (new_value)</div>
                            <pre className="m-0 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 font-mono-code text-xs">
                                {sanitizeAuditPayload(selectedActivity.new_value)}
                            </pre>
                        </div>
                    </div>
                )}
            </SideDrawer>

            <SideDrawer
                title={selectedSync ? `Chi tiết đồng bộ #${selectedSync.sync_id}` : 'Chi tiết đồng bộ'}
                open={Boolean(selectedSync)}
                onClose={() => setSelectedSync(null)}
            >
                {selectedSync && (
                    <div className="space-y-4 text-[13px]">
                        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3.5 space-y-1.5">
                            <div><strong>Nhân sự:</strong> {selectedSync.user_name || `#${selectedSync.user_id}`} ({selectedSync.user_email || 'N/A'})</div>
                            <div><strong>Loại tác vụ:</strong> <span className="font-mono-code">{selectedSync.action_type}</span></div>
                            <div><strong>Idempotency Key:</strong> <span className="font-mono-code text-xs">{selectedSync.idempotency_key}</span></div>
                            <div><strong>Trạng thái:</strong> <StatusBadge value={selectedSync.status} /></div>
                            <div><strong>Version:</strong> base {selectedSync.base_version ?? '-'} → server {selectedSync.server_version ?? '-'}</div>
                            <div><strong>Thời điểm áp dụng:</strong> {dayjs(selectedSync.applied_at).format('DD/MM/YYYY HH:mm:ss')}</div>
                        </div>
                        <div>
                            <div className="mb-1 text-xs font-bold text-[var(--text-secondary)]">Chi tiết xung đột / lỗi</div>
                            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-secondary)]">
                                {selectedSync.conflict_detail || 'Không có xung đột phiên bản.'}
                            </div>
                        </div>
                    </div>
                )}
            </SideDrawer>
        </div>
    );
}
