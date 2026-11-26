import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileCheck2,
    FolderKanban,
    History,
    Inbox,
    Layers,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    User,
    Wrench,
} from 'lucide-react';
import {
    Badge,
    Button,
    DatePicker,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Select,
    Spin,
    Tag,
    message,
} from 'antd';
import dayjs from 'dayjs';
import {
    createWorkItem,
    getMyWork,
    getWorkItemById,
    type MyWorkBuckets,
    type WorkItemDetail,
    type WorkItemSummary,
    type WorkItemType,
} from '@/api/workItems';
import { WorkflowTransitionBar } from '@/components/WorkflowTransitionBar';
import { useCapabilities } from '@/hooks/useCapabilities';
import MyTasksPage from '@/pages/MyTasksPage/MyTasksPage';

type ViewMode = 'universal' | 'project_tasks';
type TypeFilter = 'ALL' | WorkItemType;

const TYPE_META: Record<WorkItemType, { label: string; color: string; bg: string }> = {
    TASK: { label: 'Công việc', color: '#2563EB', bg: '#EFF6FF' },
    INCIDENT: { label: 'Sự cố', color: '#DC2626', bg: '#FEF2F2' },
    REQUEST: { label: 'Đề xuất', color: '#D97706', bg: '#FFFBEB' },
    INSPECTION: { label: 'Kiểm tra', color: '#059669', bg: '#ECFDF5' },
};

const SLA_META: Record<string, { label: string; color: string }> = {
    IN_SLA: { label: 'Đúng SLA', color: 'green' },
    AT_RISK: { label: 'Sắp quá hạn SLA', color: 'orange' },
    BREACHED: { label: 'Quá hạn SLA', color: 'red' },
    PAUSED: { label: 'Tạm dừng SLA', color: 'default' },
    COMPLETED: { label: 'Hoàn tất SLA', color: 'blue' },
};

const PRIORITY_COLORS: Record<string, string> = {
    Urgent: 'red',
    High: 'orange',
    Normal: 'blue',
    Low: 'default',
};

const BUCKET_CONFIG: Array<{
    key: keyof MyWorkBuckets;
    title: string;
    subtitle: string;
    accent: string;
    badgeBg: string;
}> = [
    {
        key: 'overdue',
        title: 'Quá hạn xử lý',
        subtitle: 'Cần ưu tiên xử lý ngay',
        accent: 'text-rose-700 border-rose-200 bg-rose-50/70',
        badgeBg: '#E11D48',
    },
    {
        key: 'today',
        title: 'Hạn hôm nay',
        subtitle: 'Mục tiêu hoàn tất trong ngày',
        accent: 'text-amber-700 border-amber-200 bg-amber-50/70',
        badgeBg: '#D97706',
    },
    {
        key: 'in_progress',
        title: 'Đang thực hiện',
        subtitle: 'Các đầu việc đang mở và được giao',
        accent: 'text-[#0058be] border-blue-200 bg-blue-50/70',
        badgeBg: '#0058be',
    },
    {
        key: 'waiting',
        title: 'Chờ duyệt / Chờ xử lý',
        subtitle: 'Đang chờ xác nhận hoặc phê duyệt',
        accent: 'text-slate-700 border-slate-200 bg-slate-50',
        badgeBg: '#475569',
    },
    {
        key: 'completed',
        title: 'Đã hoàn thành gần đây',
        subtitle: 'Lịch sử đầu việc đã đóng',
        accent: 'text-emerald-700 border-emerald-200 bg-emerald-50/60',
        badgeBg: '#059669',
    },
];

const getErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === 'object') {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        return e.response?.data?.message || e.message || fallback;
    }
    return fallback;
};

export default function MyWorkPage() {
    const navigate = useNavigate();
    const { capabilities, context, currentRole, canAccessCms } = useCapabilities();

    const [viewMode, setViewMode] = useState<ViewMode>('universal');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [buckets, setBuckets] = useState<MyWorkBuckets>({
        overdue: [],
        today: [],
        in_progress: [],
        waiting: [],
        completed: [],
    });

    const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
    const [searchText, setSearchText] = useState('');
    const [selectedBucket, setSelectedBucket] = useState<'ALL' | keyof MyWorkBuckets>('ALL');

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<WorkItemDetail | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form] = Form.useForm();
    const watchWorkType = Form.useWatch('work_item_type', form);

    const fetchWork = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getMyWork();
            if (res?.data?.buckets) {
                setBuckets(res.data.buckets);
                setTotalCount(res.data.total_count ?? 0);
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Không thể tải danh sách công việc của bạn.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (viewMode === 'universal') {
            fetchWork();
        }
    }, [fetchWork, viewMode]);

    const openDetail = async (itemId: number) => {
        setDetailOpen(true);
        setDetailLoading(true);
        try {
            const res = await getWorkItemById(itemId);
            setSelectedDetail(res?.data || null);
        } catch (err: unknown) {
            message.error(getErrorMessage(err, 'Không thể tải chi tiết đầu việc'));
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const filterItems = useCallback(
        (items: WorkItemSummary[]) => {
            const q = searchText.trim().toLowerCase();
            return items.filter((item) => {
                if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
                if (!q) return true;
                return (
                    item.title.toLowerCase().includes(q) ||
                    (item.asset_code || '').toLowerCase().includes(q) ||
                    (item.asset_name || '').toLowerCase().includes(q) ||
                    (item.department_name || '').toLowerCase().includes(q)
                );
            });
        },
        [searchText, typeFilter]
    );

    const visibleBuckets = useMemo(() => {
        return BUCKET_CONFIG.filter((cfg) => selectedBucket === 'ALL' || cfg.key === selectedBucket).map((cfg) => ({
            ...cfg,
            items: filterItems(buckets[cfg.key] || []),
        }));
    }, [buckets, filterItems, selectedBucket]);

    const handleCreateSubmit = async (values: {
        title: string;
        description?: string;
        work_item_type: WorkItemType;
        priority?: 'Urgent' | 'High' | 'Normal' | 'Low';
        due_date?: dayjs.Dayjs;
        department_id?: number;
        symptom?: string;
    }) => {
        try {
            setCreating(true);
            await createWorkItem({
                title: values.title,
                description: values.description,
                work_item_type: values.work_item_type,
                priority: values.priority,
                due_date: values.due_date ? values.due_date.toISOString() : undefined,
                department_id: values.department_id,
                symptom: values.symptom,
            });
            message.success('Đã tạo đầu việc mới thành công');
            setCreateOpen(false);
            form.resetFields();
            await fetchWork();
        } catch (err: unknown) {
            message.error(getErrorMessage(err, 'Không thể tạo đầu việc mới'));
        } finally {
            setCreating(false);
        }
    };

    if (viewMode === 'project_tasks') {
        return (
            <div className="flex h-full flex-col bg-[#F8FAFC]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-[#0058be]" />
                        <span className="text-sm font-bold text-slate-900">Chế độ xem Công việc</span>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                        <button
                            type="button"
                            onClick={() => setViewMode('universal')}
                            className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
                        >
                            Việc của tôi (Universal)
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('project_tasks')}
                            className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#0058be] shadow-xs"
                        >
                            Bảng Công việc Dự án
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    <MyTasksPage />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F8FAFC] font-['Plus_Jakarta_Sans','Inter',sans-serif]">
            {/* Header */}
            <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">
                                Không gian Việc của tôi
                            </h1>
                            <Tag color="blue" className="font-semibold">
                                {totalCount} đầu việc
                            </Tag>
                            <Tag className="font-semibold uppercase text-slate-600">
                                Vai trò: {currentRole}
                            </Tag>
                        </div>
                        <p className="mt-1 mb-0 text-xs font-medium text-slate-500">
                            Tổng hợp Task dự án, Sự cố thiết bị (WF-01) và Đề xuất cần bạn xử lý theo thời gian thực.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                            <button
                                type="button"
                                onClick={() => setViewMode('universal')}
                                className="cursor-pointer rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#0058be] shadow-xs"
                            >
                                Việc của tôi (Universal)
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('project_tasks')}
                                className="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
                            >
                                <FolderKanban size={13} />
                                Bảng Dự án
                            </button>
                        </div>

                        <Button
                            icon={<RefreshCw size={14} />}
                            onClick={fetchWork}
                            loading={loading}
                        >
                            Làm mới
                        </Button>

                        {capabilities.can_create_task && (
                            <Button
                                type="primary"
                                icon={<Plus size={14} />}
                                onClick={() => {
                                    form.setFieldsValue({ work_item_type: 'TASK', priority: 'Normal' });
                                    setCreateOpen(true);
                                }}
                            >
                                Tạo đầu việc
                            </Button>
                        )}
                    </div>
                </div>

                {/* Summary Strip + Filters */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedBucket('ALL')}
                            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                selectedBucket === 'ALL'
                                    ? 'border-[#0058be] bg-[#0058be] text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            Tất cả ({totalCount})
                        </button>
                        {BUCKET_CONFIG.map((b) => (
                            <button
                                key={b.key}
                                type="button"
                                onClick={() => setSelectedBucket(b.key)}
                                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                    selectedBucket === b.key
                                        ? 'border-[#0058be] bg-[#0058be] text-white'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span>{b.title}</span>
                                <span
                                    className="rounded-full px-1.5 py-0.2 text-[11px] font-bold text-white"
                                    style={{ backgroundColor: selectedBucket === b.key ? 'rgba(255,255,255,0.25)' : b.badgeBg }}
                                >
                                    {buckets[b.key]?.length || 0}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            allowClear
                            prefix={<Search size={14} className="text-slate-400" />}
                            placeholder="Tìm tiêu đề, mã thiết bị, phòng ban..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-64"
                        />
                        <Select<TypeFilter>
                            value={typeFilter}
                            onChange={setTypeFilter}
                            className="w-40"
                            options={[
                                { label: 'Mọi loại việc', value: 'ALL' },
                                { label: 'Công việc (Task)', value: 'TASK' },
                                { label: 'Sự cố (Incident)', value: 'INCIDENT' },
                                { label: 'Đề xuất (Request)', value: 'REQUEST' },
                                { label: 'Kiểm tra (Inspection)', value: 'INSPECTION' },
                            ]}
                        />
                    </div>
                </div>
            </header>

            {/* Quick Role Action Links */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-500">Lối tắt thao tác:</span>
                    {capabilities.can_report_incident && (
                        <Button size="small" icon={<AlertTriangle size={12} />} onClick={() => navigate('/incidents')}>
                            Hub Sự cố
                        </Button>
                    )}
                    <Button size="small" icon={<FileCheck2 size={12} />} onClick={() => navigate('/approvals')}>
                        Yêu cầu & Phê duyệt
                    </Button>
                    {canAccessCms && (
                        <a
                            href={import.meta.env.VITE_CMS_URL || 'http://localhost:5174'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-[#0058be] no-underline hover:bg-blue-100"
                        >
                            <span>Mở CMS Quản trị</span>
                            <ExternalLink size={11} />
                        </a>
                    )}
                </div>
                <span className="text-slate-500">
                    Lưu ý: Việc quét QR & tick checklist hiện trường thực hiện trên Mobile App; quản trị danh mục tại CMS.
                </span>
            </div>

            {/* Body */}
            <main className="flex-1 overflow-y-auto px-6 py-5">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Spin size="large" description="Đang tổng hợp đầu việc của bạn..." />
                    </div>
                ) : error ? (
                    <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-white p-6 text-center shadow-xs">
                        <ShieldAlert size={32} className="mx-auto mb-2 text-rose-500" />
                        <h3 className="text-base font-bold text-slate-900">Không thể tải dữ liệu</h3>
                        <p className="mt-1 text-sm text-slate-500">{error}</p>
                        <Button type="primary" onClick={fetchWork} className="mt-3">
                            Thử lại
                        </Button>
                    </div>
                ) : visibleBuckets.every((b) => b.items.length === 0) ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                        <Empty
                            image={<Inbox size={44} className="mx-auto text-slate-300" />}
                            description={
                                <div>
                                    <div className="font-semibold text-slate-700">Chưa có đầu việc phù hợp bộ lọc</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Thử bỏ bộ lọc tìm kiếm hoặc tạo công việc mới.
                                    </div>
                                </div>
                            }
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {visibleBuckets
                            .filter((b) => b.items.length > 0)
                            .map((bucket) => (
                                <section key={bucket.key}>
                                    <div className={`mb-3 flex items-center justify-between rounded-lg border px-4 py-2 ${bucket.accent}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold">{bucket.title}</span>
                                            <span className="text-xs opacity-80">— {bucket.subtitle}</span>
                                        </div>
                                        <Badge count={bucket.items.length} style={{ backgroundColor: bucket.badgeBg }} />
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {bucket.items.map((item) => {
                                            const typeMeta = TYPE_META[item.type] || TYPE_META.TASK;
                                            const slaMeta = item.sla_status ? SLA_META[item.sla_status] : null;
                                            return (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => openDetail(item.id)}
                                                    className="group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-[#0058be]/50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0058be]/30"
                                                >
                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between gap-2">
                                                            <span
                                                                className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                                                                style={{ color: typeMeta.color, backgroundColor: typeMeta.bg }}
                                                            >
                                                                #{item.id} • {typeMeta.label}
                                                            </span>
                                                            <Tag color={PRIORITY_COLORS[item.priority] || 'default'} className="m-0 text-[11px]">
                                                                {item.priority}
                                                            </Tag>
                                                        </div>

                                                        <h3 className="m-0 line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-[#0058be]">
                                                            {item.title}
                                                        </h3>

                                                        {item.description && (
                                                            <p className="mt-1.5 mb-0 line-clamp-2 text-xs text-slate-500">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px]">
                                                        {item.current_state_name && (
                                                            <Tag
                                                                color={item.state_color || 'blue'}
                                                                className="m-0 font-semibold"
                                                            >
                                                                {item.current_state_name}
                                                            </Tag>
                                                        )}
                                                        {slaMeta && (
                                                            <Tag color={slaMeta.color} className="m-0">
                                                                {slaMeta.label}
                                                            </Tag>
                                                        )}
                                                        {item.asset_code && (
                                                            <Tag icon={<Wrench size={10} />} className="m-0">
                                                                {item.asset_code}
                                                            </Tag>
                                                        )}
                                                        {item.due_date && (
                                                            <span className="ml-auto inline-flex items-center gap-1 text-slate-500">
                                                                <Calendar size={11} />
                                                                {dayjs(item.due_date).format('DD/MM HH:mm')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                    </div>
                )}
            </main>

            {/* Detail Drawer */}
            <Drawer
                title={selectedDetail ? `Chi tiết đầu việc #${selectedDetail.id}` : 'Chi tiết đầu việc'}
                open={detailOpen}
                onClose={() => {
                    setDetailOpen(false);
                    setSelectedDetail(null);
                }}
                size="large"
            >
                {detailLoading || !selectedDetail ? (
                    <div className="flex h-48 items-center justify-center">
                        <Spin />
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <Tag color="blue">{TYPE_META[selectedDetail.type]?.label || selectedDetail.type}</Tag>
                                <Tag color={PRIORITY_COLORS[selectedDetail.priority] || 'default'}>
                                    Ưu tiên: {selectedDetail.priority}
                                </Tag>
                                {selectedDetail.current_state_name && (
                                    <Tag color={selectedDetail.state_color || 'geekblue'}>
                                        Trạng thái: {selectedDetail.current_state_name}
                                    </Tag>
                                )}
                                {selectedDetail.sla_status && SLA_META[selectedDetail.sla_status] && (
                                    <Tag color={SLA_META[selectedDetail.sla_status].color}>
                                        {SLA_META[selectedDetail.sla_status].label}
                                    </Tag>
                                )}
                            </div>
                            <h2 className="m-0 text-lg font-extrabold text-slate-900">{selectedDetail.title}</h2>
                            {selectedDetail.description && (
                                <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                                    {selectedDetail.description}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                            <div>
                                <span className="text-slate-400">Đơn vị / Phòng ban</span>
                                <div className="mt-0.5 font-semibold text-slate-800">
                                    {selectedDetail.department_name || 'Chưa phân đơn vị'}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400">Thiết bị liên quan</span>
                                <div className="mt-0.5 font-semibold text-slate-800">
                                    {selectedDetail.asset_name
                                        ? `${selectedDetail.asset_name} (${selectedDetail.asset_code})`
                                        : 'Không gắn thiết bị'}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400">Hạn xử lý</span>
                                <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-800">
                                    <Clock size={12} />
                                    {selectedDetail.due_date
                                        ? dayjs(selectedDetail.due_date).format('DD/MM/YYYY HH:mm')
                                        : 'Chưa thiết lập'}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-400">Người tạo</span>
                                <div className="mt-0.5 flex items-center gap-1 font-semibold text-slate-800">
                                    <User size={12} />
                                    {selectedDetail.creator_name || 'Hệ thống'}
                                </div>
                            </div>
                        </div>

                        {/* Workflow Transition Bar */}
                        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#0058be]">
                                Chuyển trạng thái Workflow & Xử lý
                            </div>
                            <WorkflowTransitionBar
                                taskId={selectedDetail.id}
                                taskName={selectedDetail.title}
                                assetName={selectedDetail.asset_name || undefined}
                                symptom={selectedDetail.incident?.symptom}
                                currentStateCode={selectedDetail.current_state_code || undefined}
                                onTransitionSuccess={() => {
                                    openDetail(selectedDetail.id);
                                    fetchWork();
                                }}
                            />
                        </div>

                        {/* Assignees */}
                        <div>
                            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                Người phụ trách ({selectedDetail.assignees?.length || 0})
                            </h4>
                            {selectedDetail.assignees && selectedDetail.assignees.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedDetail.assignees.map((a) => (
                                        <Tag key={a.user_id} icon={<CheckCircle2 size={11} />}>
                                            {a.name} ({a.email})
                                        </Tag>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400">Chưa có người được phân công</span>
                            )}
                        </div>

                        {/* Activity Logs */}
                        <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                                <History size={13} />
                                Nhật ký xử lý
                            </h4>
                            {selectedDetail.activity_logs && selectedDetail.activity_logs.length > 0 ? (
                                <div className="flex flex-col gap-2 border-l-2 border-slate-200 pl-3">
                                    {selectedDetail.activity_logs.map((log) => (
                                        <div key={log.activity_id} className="text-xs">
                                            <div className="font-semibold text-slate-800">
                                                {log.actor_name || 'Hệ thống'} • {log.action}
                                            </div>
                                            <div className="text-[11px] text-slate-400">
                                                {dayjs(log.created_at).format('DD/MM/YYYY HH:mm')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-400">Chưa có nhật ký thay đổi</span>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>

            {/* Quick Create Work Item Modal */}
            <Modal
                title="Tạo đầu việc mới"
                open={createOpen}
                onCancel={() => setCreateOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={creating}
                okText="Tạo mới"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleCreateSubmit} className="mt-3">
                    <Form.Item
                        name="work_item_type"
                        label="Loại đầu việc"
                        rules={[{ required: true }]}
                    >
                        <Select
                            options={[
                                { label: 'Công việc (TASK)', value: 'TASK' },
                                { label: 'Đề xuất nội bộ (REQUEST)', value: 'REQUEST' },
                                ...(capabilities.can_report_incident
                                    ? [{ label: 'Báo cáo sự cố (INCIDENT)', value: 'INCIDENT' }]
                                    : []),
                            ]}
                        />
                    </Form.Item>

                    <Form.Item
                        name="title"
                        label="Tiêu đề"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                    >
                        <Input placeholder="VD: Kiểm tra van áp suất dây chuyền B2" />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-3">
                        <Form.Item name="priority" label="Mức độ ưu tiên">
                            <Select
                                options={[
                                    { label: 'Khẩn cấp (Urgent)', value: 'Urgent' },
                                    { label: 'Cao (High)', value: 'High' },
                                    { label: 'Bình thường (Normal)', value: 'Normal' },
                                    { label: 'Thấp (Low)', value: 'Low' },
                                ]}
                            />
                        </Form.Item>

                        <Form.Item name="due_date" label="Hạn hoàn tất">
                            <DatePicker showTime className="w-full" placeholder="Chọn thời hạn" />
                        </Form.Item>
                    </div>

                    {context?.departments && context.departments.length > 0 && (
                        <Form.Item name="department_id" label="Đơn vị thực hiện">
                            <Select
                                allowClear
                                placeholder="Chọn phòng ban / phân xưởng"
                                options={context.departments.map((d) => ({
                                    label: `${d.code} - ${d.name}`,
                                    value: d.department_id,
                                }))}
                            />
                        </Form.Item>
                    )}

                    {watchWorkType === 'INCIDENT' && (
                        <Form.Item
                            name="symptom"
                            label="Triệu chứng sự cố"
                            rules={[{ required: true, message: 'Vui lòng mô tả triệu chứng' }]}
                        >
                            <Input placeholder="VD: Máy rung mạnh, nhiệt độ dầu > 80°C" />
                        </Form.Item>
                    )}

                    <Form.Item name="description" label="Mô tả chi tiết">
                        <Input.TextArea rows={3} placeholder="Thông tin bổ sung cho người thực hiện..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
