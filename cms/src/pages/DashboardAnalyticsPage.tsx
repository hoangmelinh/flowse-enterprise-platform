import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Collapse, Progress, Segmented, Select, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    AlertTriangle,
    ArrowUpRight,
    Bot,
    CheckCircle2,
    ChevronRight,
    Database,
    Info,
    Printer,
    RefreshCw,
} from 'lucide-react';
import {
    getAnalyticsSummary,
    getOperationsOverview,
    type AnalyticsSummaryData,
    type OperationsDepartmentRow,
    type OperationsOverviewData,
} from '@/api/cmsApi';
import { useCmsAuth } from '@/context/CmsAuthContext';
import { getApiErrorMessage } from '@/utils/error';
import {
    DataTable,
    EmptyState,
    ErrorState,
    FilterBar,
    KpiMetricTile,
    LoadingState,
    PageHeader,
    ScopeSwitch,
    StatusBadge,
    type BusinessScope,
    type MetricTone,
} from '@/components/ui';

type PeriodOption = 'today' | 'week' | 'month' | 'all';

const WORKSPACE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:5173';

const PERIOD_LABELS: Record<PeriodOption, string> = {
    today: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    all: 'Toàn thời gian',
};

const SCOPE_LABELS: Record<BusinessScope, string> = {
    all: 'Toàn công ty',
    office: 'Công việc & Đề xuất',
    industrial: 'Thiết bị & Sự cố',
};

const SCOPE_DESCRIPTIONS: Record<BusinessScope, string> = {
    all: 'Tổng hợp toàn công ty trong kỳ, tách bạch luồng công việc văn phòng với trạng thái thiết bị và sự cố hiện trường.',
    office: 'Theo dõi công việc giao nhận, đề xuất nội bộ, hàng đợi phê duyệt và tiến độ hoàn thành đúng hạn.',
    industrial: 'Giám sát mức độ sẵn sàng thiết bị, sự cố đang mở, kiểm tra hiện trường và thời gian xử lý.',
};

interface AttentionItem {
    key: string;
    label: string;
    count: number;
    detail: string;
    severity: 'danger' | 'warning';
    actionLabel: string;
    to?: string;
    externalHref?: string;
}

function formatDuration(minutes?: number | null): string {
    if (minutes === null || minutes === undefined) return 'N/A';
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return hrs > 0 ? `${hrs}h ${rem}p` : `${rem} phút`;
}

function stripMarkdownTokens(text: string): string {
    return text
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .trim();
}

function getRateTone(rate: number | null | undefined, threshold = 85): MetricTone {
    if (rate === null || rate === undefined) return 'neutral';
    return rate >= threshold ? 'success' : 'warning';
}

function buildWorkspaceUrl(path: string, workspaceId: number | null, extraParams?: Record<string, string>): string {
    const params = new URLSearchParams();
    if (workspaceId) params.set('workspaceId', String(workspaceId));
    if (extraParams) {
        for (const [k, v] of Object.entries(extraParams)) {
            if (v) params.set(k, v);
        }
    }
    const qs = params.toString();
    return `${WORKSPACE_URL}${path}${qs ? `?${qs}` : ''}`;
}

function buildCmsLink(path: string, extraParams?: Record<string, string | number | null | undefined>): string {
    const params = new URLSearchParams();
    if (extraParams) {
        for (const [k, v] of Object.entries(extraParams)) {
            if (v !== null && v !== undefined && v !== '') {
                params.set(k, String(v));
            }
        }
    }
    const qs = params.toString();
    return `${path}${qs ? `?${qs}` : ''}`;
}

function buildAttentionItems(
    scope: BusinessScope,
    period: PeriodOption,
    overview: OperationsOverviewData | null,
    options: { workspaceId: number | null; departmentId: number | null; isAdmin: boolean }
): AttentionItem[] {
    if (!overview) return [];
    const items: AttentionItem[] = [];
    const ent = overview.enterprise;
    const off = overview.office;
    const ind = overview.industrial;
    const { workspaceId, departmentId, isAdmin } = options;

    if (scope === 'all' && ent) {
        if ((ind?.incidents.openCritical ?? 0) > 0) {
            items.push({
                key: 'critical-incidents',
                label: 'Sự cố khẩn cấp chưa xử lý',
                count: ind!.incidents.openCritical,
                detail: 'Tồn đọng hiện hành · Sự cố mức CRITICAL cần phân công và xử lý tại Hub Sự cố.',
                severity: 'danger',
                actionLabel: 'Mở Hub Sự cố',
                externalHref: buildWorkspaceUrl('/incidents', workspaceId, { severity: 'CRITICAL' }),
            });
        }
        if (ent.overdueTotal > 0) {
            items.push({
                key: 'overdue-all',
                label: 'Đầu việc quá hạn',
                count: ent.overdueTotal,
                detail: 'Tồn đọng toàn Workspace quá due_date hoặc quá hạn SLA (trang Việc của tôi hiển thị việc bạn phụ trách).',
                severity: 'danger',
                actionLabel: 'Mở Việc của tôi',
                externalHref: buildWorkspaceUrl('/home', workspaceId),
            });
        }
        if ((ind?.assetsByStatus.FAULTY ?? 0) > 0) {
            items.push({
                key: 'faulty-assets',
                label: 'Thiết bị đang báo hỏng',
                count: ind!.assetsByStatus.FAULTY,
                detail: 'Trạng thái hiện tại FAULTY trong phạm vi đang lọc.',
                severity: 'warning',
                actionLabel: 'Lọc thiết bị hỏng',
                to: buildCmsLink('/assets', { status: 'FAULTY', departmentId }),
            });
        }
        if (ent.pendingApprovalsTotal > 0) {
            items.push({
                key: 'pending-approvals',
                label: 'Phiếu chờ phê duyệt',
                count: ent.pendingApprovalsTotal,
                detail: `Hiện chờ duyệt: ${off?.pendingApprovals ?? 0} phiếu văn phòng · ${ind?.pendingMaintenanceApprovals ?? 0} phiếu vật tư/bảo trì.`,
                severity: 'warning',
                actionLabel: 'Mở Trung tâm Duyệt',
                externalHref: buildWorkspaceUrl('/approvals', workspaceId),
            });
        }
        if (ent.sla.breachedCount > 0) {
            items.push({
                key: 'breached-sla',
                label: `Vi phạm SLA (${PERIOD_LABELS[period]})`,
                count: ent.sla.breachedCount,
                detail: `Theo ngày tạo trong kỳ: ${ent.sla.metCount} đạt · ${ent.sla.breachedCount} vi phạm · ${ent.sla.atRiskCount} sắp hết hạn.`,
                severity: 'warning',
                actionLabel: isAdmin ? 'Điều chỉnh định mức SLA' : 'Xem định mức SLA',
                to: '/workflows-sla?tab=sla',
            });
        }
        return items;
    }

    if (scope === 'office' && off) {
        const overdueOffice = off.overdueTasks + off.overdueRequests;
        if (overdueOffice > 0) {
            items.push({
                key: 'overdue-office',
                label: 'Công việc & đề xuất quá hạn',
                count: overdueOffice,
                detail: `Tồn đọng hiện hành: ${off.overdueTasks} công việc · ${off.overdueRequests} đề xuất vượt hạn.`,
                severity: 'danger',
                actionLabel: 'Mở Việc của tôi',
                externalHref: buildWorkspaceUrl('/home', workspaceId),
            });
        }
        if (off.pendingApprovals > 0) {
            items.push({
                key: 'office-approvals',
                label: 'Phiếu văn phòng chờ phê duyệt',
                count: off.pendingApprovals,
                detail: 'Yêu cầu phê duyệt hành chính, nhân sự và vận hành nội bộ.',
                severity: 'warning',
                actionLabel: 'Duyệt phiếu ngay',
                externalHref: buildWorkspaceUrl('/approvals', workspaceId),
            });
        }
        if (off.sla.breachedCount > 0) {
            items.push({
                key: 'office-sla-breach',
                label: `Vi phạm SLA công việc (${PERIOD_LABELS[period]})`,
                count: off.sla.breachedCount,
                detail: `Theo ngày tạo trong kỳ: ${off.sla.metCount} đạt · ${off.sla.breachedCount} vi phạm.`,
                severity: 'warning',
                actionLabel: isAdmin ? 'Điều chỉnh định mức SLA' : 'Xem định mức SLA',
                to: '/workflows-sla?tab=sla',
            });
        }
        return items;
    }

    if (scope === 'industrial' && ind) {
        if (ind.incidents.openCritical > 0) {
            items.push({
                key: 'ind-critical',
                label: 'Sự cố khẩn cấp (CRITICAL)',
                count: ind.incidents.openCritical,
                detail: `Tồn đọng hiện hành: trong tổng ${ind.incidents.openTotal} sự cố chưa xử lý (${ind.incidents.openHigh} mức cao).`,
                severity: 'danger',
                actionLabel: 'Mở Hub Sự cố',
                externalHref: buildWorkspaceUrl('/incidents', workspaceId, { severity: 'CRITICAL' }),
            });
        }
        if (ind.assetsByStatus.FAULTY > 0) {
            items.push({
                key: 'ind-faulty',
                label: 'Thiết bị báo hỏng (FAULTY)',
                count: ind.assetsByStatus.FAULTY,
                detail: 'Trạng thái hiện tại FAULTY, cần điều phối bảo trì hoặc kiểm tra trực tiếp.',
                severity: 'danger',
                actionLabel: 'Lọc thiết bị hỏng',
                to: buildCmsLink('/assets', { status: 'FAULTY', departmentId }),
            });
        }
        if (ind.pendingMaintenanceApprovals > 0) {
            items.push({
                key: 'ind-approvals',
                label: 'Phiếu vật tư & bảo trì chờ duyệt',
                count: ind.pendingMaintenanceApprovals,
                detail: 'Đề xuất cấp phát vật tư/bảo trì gắn trực tiếp với sự cố hoặc thiết bị.',
                severity: 'warning',
                actionLabel: 'Mở Trung tâm Duyệt',
                externalHref: buildWorkspaceUrl('/approvals', workspaceId),
            });
        }
        if (ind.inspections.failCount > 0) {
            items.push({
                key: 'ind-inspection-fail',
                label: `Lượt kiểm tra không đạt (${PERIOD_LABELS[period]})`,
                count: ind.inspections.failCount,
                detail: 'Checklist kiểm tra hiện trường trong kỳ ghi nhận kết quả FAIL.',
                severity: 'warning',
                actionLabel: 'Xem lượt FAIL',
                to: '/inspections?tab=runs&status=FAIL',
            });
        }
        if (ind.sla.breachedCount > 0) {
            items.push({
                key: 'ind-sla-breach',
                label: `Vi phạm SLA sự cố (${PERIOD_LABELS[period]})`,
                count: ind.sla.breachedCount,
                detail: 'Sự cố thiết bị trong kỳ có bản ghi SLA ở trạng thái vi phạm.',
                severity: 'warning',
                actionLabel: 'Xem sự cố vi phạm SLA',
                externalHref: buildWorkspaceUrl('/incidents', workspaceId, { sla: 'BREACHED' }),
            });
        }
    }

    return items;
}

export default function DashboardAnalyticsPage() {
    const { currentWorkspaceId, currentRole, isAdmin } = useCmsAuth();

    const [scope, setScope] = useState<BusinessScope>('all');
    const [period, setPeriod] = useState<PeriodOption>('month');
    const [departmentId, setDepartmentId] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [overview, setOverview] = useState<OperationsOverviewData | null>(null);
    const [aiData, setAiData] = useState<AnalyticsSummaryData | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const requestSeqRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setDepartmentId(null);
        setOverview(null);
        setAiData(null);
        setErrorMsg(null);
        setAiError(null);
    }, [currentWorkspaceId]);

    const loadDashboard = useCallback(async () => {
        if (!currentWorkspaceId) {
            setLoading(false);
            setOverview(null);
            return;
        }

        if (abortRef.current) {
            abortRef.current.abort();
        }
        const controller = new AbortController();
        abortRef.current = controller;
        const seq = ++requestSeqRef.current;

        try {
            setLoading(true);
            setErrorMsg(null);
            setAiError(null);

            const overviewPromise = getOperationsOverview(
                currentWorkspaceId,
                { period, scope, departmentId },
                controller.signal
            );

            const aiPromise =
                scope !== 'office'
                    ? getAnalyticsSummary(period, currentWorkspaceId, controller.signal)
                    : Promise.resolve(null);

            const [ovSettled, aiSettled] = await Promise.allSettled([overviewPromise, aiPromise]);

            if (controller.signal.aborted || seq !== requestSeqRef.current) return;

            if (ovSettled.status === 'fulfilled' && ovSettled.value?.data) {
                setOverview(ovSettled.value.data);
            } else if (ovSettled.status === 'rejected') {
                const msg = getApiErrorMessage(ovSettled.reason, 'Không thể tải số liệu tổng quan vận hành');
                setErrorMsg(msg);
                message.error(msg);
            }

            if (aiSettled.status === 'fulfilled' && aiSettled.value?.data) {
                setAiData(aiSettled.value.data);
            } else if (aiSettled.status === 'rejected') {
                setAiError(getApiErrorMessage(aiSettled.reason, 'Không thể tải phân tích sự cố từ hệ thống'));
            }
        } finally {
            if (!controller.signal.aborted && seq === requestSeqRef.current) {
                setLoading(false);
            }
        }
    }, [currentWorkspaceId, period, scope, departmentId]);

    useEffect(() => {
        loadDashboard();
        return () => {
            abortRef.current?.abort();
        };
    }, [loadDashboard]);

    const departmentOptions = useMemo(
        () =>
            (overview?.departments || []).map((d) => ({
                label: `${d.code} — ${d.name}`,
                value: d.department_id,
            })),
        [overview?.departments]
    );

    const departmentColumns = useMemo<ColumnsType<OperationsDepartmentRow>>(() => {
        const unitCol: ColumnsType<OperationsDepartmentRow>[number] = {
            title: 'Phòng ban / Bộ phận',
            key: 'dept',
            sorter: (a, b) => a.name.localeCompare(b.name, 'vi'),
            render: (_: unknown, r: OperationsDepartmentRow) => (
                <div>
                    <div className="font-semibold text-[var(--text-primary)]">{r.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                        <span className="font-mono-code">{r.code}</span>
                        <span> · </span>
                        <span className="tabular-nums">{r.active_members}</span> nhân sự
                    </div>
                </div>
            ),
        };

        const officeGroup: ColumnsType<OperationsDepartmentRow>[number] = {
            title: 'Công việc & Đề xuất',
            children: [
                {
                    title: 'Công việc đang mở',
                    dataIndex: 'open_tasks',
                    key: 'open_tasks',
                    align: 'right',
                    sorter: (a, b) => a.open_tasks - b.open_tasks,
                    render: (v: number) => <span className="tabular-nums font-semibold text-[#0058BE]">{v}</span>,
                },
                {
                    title: 'Đề xuất đang mở',
                    dataIndex: 'open_requests',
                    key: 'open_requests',
                    align: 'right',
                    sorter: (a, b) => a.open_requests - b.open_requests,
                    render: (v: number) => <span className="tabular-nums font-medium">{v}</span>,
                },
            ],
        };

        const industrialGroup: ColumnsType<OperationsDepartmentRow>[number] = {
            title: 'Thiết bị & Sự cố',
            children: [
                {
                    title: 'Thiết bị',
                    dataIndex: 'asset_count',
                    key: 'asset_count',
                    align: 'right',
                    sorter: (a, b) => a.asset_count - b.asset_count,
                    render: (v: number) => <span className="tabular-nums font-medium">{v}</span>,
                },
                {
                    title: 'Sự cố chưa xử lý',
                    dataIndex: 'open_incidents',
                    key: 'open_incidents',
                    align: 'right',
                    sorter: (a, b) => a.open_incidents - b.open_incidents,
                    render: (v: number) => (
                        <span
                            className={`tabular-nums font-semibold ${
                                v > 0 ? 'text-[var(--status-danger)]' : 'text-[var(--text-secondary)]'
                            }`}
                        >
                            {v}
                        </span>
                    ),
                },
            ],
        };

        if (scope === 'office') return [unitCol, officeGroup];
        if (scope === 'industrial') return [unitCol, industrialGroup];
        return [unitCol, officeGroup, industrialGroup];
    }, [scope]);

    const topAssetColumns: ColumnsType<NonNullable<OperationsOverviewData['industrial']>['topDowntimeAssets'][number]> = [
        {
            title: 'Thiết bị',
            key: 'asset',
            sorter: (a, b) => a.asset_name.localeCompare(b.asset_name, 'vi'),
            render: (_: unknown, record) => (
                <div>
                    <div className="font-semibold text-[var(--text-primary)]">
                        <span className="font-mono-code mr-1.5 text-xs text-[var(--brand-primary)]">
                            {record.asset_code}
                        </span>
                        {record.asset_name}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{record.location || 'Chưa cập nhật vị trí'}</div>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (st: string) => <StatusBadge value={st} />,
        },
        {
            title: 'Sự cố đã đóng',
            dataIndex: 'incident_count',
            key: 'incident_count',
            align: 'right' as const,
            sorter: (a, b) => a.incident_count - b.incident_count,
            render: (c: number) => <span className="tabular-nums font-semibold">{c}</span>,
        },
        {
            title: 'Tổng thời gian sự cố',
            dataIndex: 'total_elapsed_minutes',
            key: 'total_elapsed_minutes',
            align: 'right' as const,
            sorter: (a, b) => a.total_elapsed_minutes - b.total_elapsed_minutes,
            render: (mins: number) => (
                <span className="tabular-nums font-semibold text-[var(--status-danger)]">
                    {formatDuration(mins)}
                </span>
            ),
        },
        {
            title: 'Tỷ trọng',
            key: 'share',
            width: 150,
            render: (
                _: unknown,
                record: NonNullable<OperationsOverviewData['industrial']>['topDowntimeAssets'][number]
            ) => {
                const total = overview?.industrial?.downtime.totalElapsedMinutes || 0;
                const pct = total > 0 ? Math.min(100, Math.round((record.total_elapsed_minutes / total) * 100)) : 0;
                return (
                    <div className="flex items-center gap-2">
                        <Progress percent={pct} size="small" showInfo={false} strokeColor="#0058BE" />
                        <span className="tabular-nums text-xs text-[var(--text-secondary)]">{pct}%</span>
                    </div>
                );
            },
        },
    ];

    const ent = overview?.enterprise;
    const off = overview?.office;
    const ind = overview?.industrial;
    const openEnterpriseTotal = ent
        ? ent.openByType.TASK + ent.openByType.REQUEST + ent.openByType.INCIDENT + ent.openByType.INSPECTION
        : 0;

    const attentionItems = useMemo(
        () => buildAttentionItems(scope, period, overview, { workspaceId: currentWorkspaceId, departmentId, isAdmin }),
        [scope, period, overview, currentWorkspaceId, departmentId, isAdmin]
    );

    const insightsFacts = aiData?.observedFacts || aiData?.keyFindings || [];
    const insightsCauses = aiData?.possibleCauses || aiData?.rootCauses || [];
    const insightsRecommendations = aiData?.recommendations || aiData?.prescriptiveRecommendations || [];
    const cleanedSummary = aiData?.executiveSummary ? stripMarkdownTokens(aiData.executiveSummary) : '';

    return (
        <div>
            <PageHeader
                title="Tổng quan Điều hành Doanh nghiệp"
                description={SCOPE_DESCRIPTIONS[scope]}
                meta={
                    overview?.meta.userScope === 'DEPARTMENT' ? (
                        <Tag color="gold">Phạm vi phòng ban được phân công</Tag>
                    ) : (
                        <Tag color="blue">Toàn Workspace ({currentRole.toUpperCase()})</Tag>
                    )
                }
                actions={
                    <>
                        <Button icon={<RefreshCw size={14} />} onClick={loadDashboard} loading={loading}>
                            Làm mới
                        </Button>
                        <Button icon={<Printer size={14} />} onClick={() => window.print()}>
                            In báo cáo A4
                        </Button>
                    </>
                }
            />

            <FilterBar
                left={<ScopeSwitch value={scope} onChange={setScope} />}
                right={
                    <>
                        <Select
                            allowClear
                            aria-label="Lọc theo phòng ban"
                            placeholder="Tất cả phòng ban"
                            className="w-48 sm:w-56"
                            value={departmentId ?? undefined}
                            onChange={(val) => setDepartmentId(val ? Number(val) : null)}
                            options={departmentOptions}
                        />
                        <Segmented
                            aria-label="Chọn chu kỳ thống kê"
                            value={period}
                            onChange={(v) => setPeriod(v as PeriodOption)}
                            options={[
                                { label: 'Hôm nay', value: 'today' },
                                { label: 'Tuần', value: 'week' },
                                { label: 'Tháng', value: 'month' },
                                { label: 'Tất cả', value: 'all' },
                            ]}
                        />
                    </>
                }
            />

            {!currentWorkspaceId ? (
                <EmptyState
                    title="Chưa chọn Workspace"
                    description="Vui lòng chọn một Workspace ở thanh tiêu đề để xem dữ liệu điều hành."
                />
            ) : loading && (!overview || overview.meta.scope !== scope) ? (
                <LoadingState rows={6} />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadDashboard} />
            ) : !overview ? (
                <EmptyState title="Không có dữ liệu tổng quan" />
            ) : (
                <div className={`space-y-6 transition-opacity ${loading ? 'opacity-65' : ''}`}>
                    {/* AREA A: CẦN CHÚ Ý NGAY (REQUIRES ATTENTION) */}
                    <section aria-label="Cần chú ý ngay" className="cms-panel overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-2">
                                <AlertTriangle
                                    size={16}
                                    className={
                                        attentionItems.some((i) => i.severity === 'danger')
                                            ? 'text-[var(--status-danger)]'
                                            : attentionItems.length > 0
                                            ? 'text-[var(--status-warning)]'
                                            : 'text-[var(--status-success)]'
                                    }
                                    aria-hidden="true"
                                />
                                <h2 className="m-0 text-[15px] font-bold text-[var(--text-primary)]">Cần chú ý ngay</h2>
                                {attentionItems.length > 0 && (
                                    <Tag color={attentionItems.some((i) => i.severity === 'danger') ? 'red' : 'gold'} className="m-0">
                                        {attentionItems.length} hạng mục
                                    </Tag>
                                )}
                                {loading && (
                                    <Tag color="processing" className="m-0">
                                        Đang cập nhật số liệu...
                                    </Tag>
                                )}
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">
                                {SCOPE_LABELS[scope]} · Tồn đọng hiện hành &amp; cảnh báo {PERIOD_LABELS[period].toLowerCase()}
                            </span>
                        </div>

                        {loading ? (
                            <div className="px-4 py-3.5 text-sm text-[var(--text-muted)] sm:px-5">
                                Đang đồng bộ số liệu theo bộ lọc mới...
                            </div>
                        ) : attentionItems.length === 0 ? (
                            <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-[var(--status-success)] sm:px-5">
                                <CheckCircle2 size={16} aria-hidden="true" />
                                <span className="font-medium">
                                    Không ghi nhận mục khẩn cấp cần xử lý ngay trong bộ lọc hiện tại.
                                </span>
                            </div>
                        ) : (
                            <ul className="m-0 divide-y divide-[var(--border-subtle)] p-0 list-none">
                                {attentionItems.map((item) => (
                                    <li
                                        key={item.key}
                                        className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`h-2 w-2 shrink-0 rounded-full ${
                                                        item.severity === 'danger' ? 'bg-[#DC2626]' : 'bg-[#D97706]'
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                                <span className="text-sm font-semibold text-[var(--text-primary)]">
                                                    {item.label}
                                                </span>
                                                <span
                                                    className={`tabular-nums rounded px-1.5 py-0.5 text-xs font-bold ${
                                                        item.severity === 'danger'
                                                            ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger)]'
                                                            : 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]'
                                                    }`}
                                                >
                                                    {item.count}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 mb-0 pl-4 text-[13px] leading-snug text-[var(--text-secondary)]">
                                                {item.detail}
                                            </p>
                                        </div>
                                        <div className="pl-4 sm:pl-4 shrink-0">
                                            {item.to ? (
                                                <Link
                                                    to={item.to}
                                                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--brand-primary)] no-underline hover:underline"
                                                >
                                                    <span>{item.actionLabel}</span>
                                                    <ChevronRight size={14} aria-hidden="true" />
                                                </Link>
                                            ) : item.externalHref ? (
                                                <a
                                                    href={item.externalHref}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--brand-primary)] no-underline hover:underline"
                                                >
                                                    <span>{item.actionLabel}</span>
                                                    <ArrowUpRight size={14} aria-hidden="true" />
                                                </a>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* AREA B: TỔNG QUAN VẬN HÀNH (OPERATIONAL OVERVIEW) */}
                    <section aria-label="Tổng quan vận hành" className="space-y-3.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="m-0 text-[15px] font-bold text-[var(--text-primary)]">
                                Tổng quan Vận hành — {SCOPE_LABELS[scope]}
                            </h2>
                            <span className="text-[13px] text-[var(--text-muted)]">
                                Chu kỳ: <strong className="font-semibold text-[var(--text-secondary)]">{PERIOD_LABELS[period]}</strong>
                            </span>
                        </div>

                        {scope === 'all' && ent && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <KpiMetricTile
                                    label="Đầu việc đang mở"
                                    value={openEnterpriseTotal}
                                    tone="brand"
                                    tooltip="Tồn đọng hiện hành: tổng TASK, REQUEST, INCIDENT và INSPECTION chưa đóng (không phụ thuộc chu kỳ lọc)."
                                    subtitle={`Hiện hành · ${ent.openByType.TASK} Công việc · ${ent.openByType.REQUEST} Đề xuất · ${ent.openByType.INCIDENT} Sự cố`}
                                />
                                <KpiMetricTile
                                    label="Hoàn thành đúng hạn (Văn phòng)"
                                    value={off ? off.onTimeRate : null}
                                    unit="%"
                                    tone={getRateTone(off?.onTimeRate)}
                                    tooltip="Theo ngày hoàn thành trong kỳ: completed_at <= due_date trên các TASK/REQUEST có due_date."
                                    subtitle={
                                        off && off.completedWithDueDateInPeriod > 0
                                            ? `${off.completedOnTimeInPeriod}/${off.completedWithDueDateInPeriod} việc hoàn thành trước hạn`
                                            : off
                                            ? `Tạo mới ${off.createdInPeriod} · Hoàn thành ${off.completedInPeriod}`
                                            : undefined
                                    }
                                    unavailableReason={
                                        !off
                                            ? 'Dữ liệu văn phòng chưa khả dụng'
                                            : `Chưa có việc có hạn chót (${off.createdInPeriod} tạo mới kỳ này)`
                                    }
                                />
                                <KpiMetricTile
                                    label="Thiết bị sẵn sàng"
                                    value={ind && ind.assetsByStatus.total > 0 ? ind.assetsByStatus.OPERATIONAL : null}
                                    unit={ind && ind.assetsByStatus.total > 0 ? `/ ${ind.assetsByStatus.total}` : undefined}
                                    tone={ind && ind.assetsByStatus.FAULTY > 0 ? 'warning' : 'success'}
                                    tooltip="Trạng thái thiết bị hiện hành (OPERATIONAL / tổng thiết bị) kết hợp tỷ lệ kiểm tra đạt trong kỳ."
                                    subtitle={
                                        ind
                                            ? `${ind.assetsByStatus.MAINTENANCE} bảo trì · ${ind.assetsByStatus.FAULTY} báo hỏng · Kiểm tra đạt ${
                                                  ind.inspections.passRate !== null ? `${ind.inspections.passRate}%` : 'N/A'
                                              }`
                                            : undefined
                                    }
                                    unavailableReason={
                                        !ind ? 'Dữ liệu thiết bị chưa khả dụng' : 'Chưa có thiết bị thuộc phạm vi'
                                    }
                                />
                                <KpiMetricTile
                                    label={`Tuân thủ SLA (${PERIOD_LABELS[period]})`}
                                    value={ent.sla.complianceRate}
                                    unit="%"
                                    tone={getRateTone(ent.sla.complianceRate)}
                                    tooltip="Theo ngày tạo trong kỳ: tỷ lệ SLA đạt hạn / (đạt + vi phạm) trên sla_instances mới nhất mỗi đầu việc."
                                    subtitle={`${ent.sla.metCount} đạt · ${ent.sla.breachedCount} vi phạm · ${ent.sla.atRiskCount} sắp hết hạn`}
                                    unavailableReason="Chưa phát sinh bản ghi SLA đạt hoặc vi phạm"
                                />
                            </div>
                        )}

                        {scope === 'all' && !ent && (
                            <EmptyState embedded title="Dữ liệu tổng hợp toàn công ty chưa sẵn sàng" />
                        )}

                        {scope === 'office' && !off && (
                            <EmptyState embedded title="Dữ liệu Công việc & Đề xuất chưa sẵn sàng" />
                        )}

                        {scope === 'office' && off && (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                    <KpiMetricTile
                                        label="Công việc đang mở"
                                        value={off.openTasks}
                                        tone="brand"
                                        tooltip="Tồn đọng hiện hành: số TASK chưa đóng (trạng thái is_terminal = false)."
                                        subtitle={`Hiện hành · ${off.overdueTasks} công việc quá hạn`}
                                    />
                                    <KpiMetricTile
                                        label="Đề xuất đang mở"
                                        value={off.openRequests}
                                        tone={off.overdueRequests > 0 ? 'warning' : 'neutral'}
                                        tooltip="Tồn đọng hiện hành: số REQUEST nội bộ chưa đóng."
                                        subtitle={`Hiện hành · ${off.overdueRequests} đề xuất quá hạn`}
                                    />
                                    <KpiMetricTile
                                        label="Phiếu chờ phê duyệt"
                                        value={off.pendingApprovals}
                                        tone={off.pendingApprovals > 0 ? 'warning' : 'success'}
                                        tooltip="Tồn đọng hiện hành: phiếu APPROVAL PENDING thuộc TASK/REQUEST không gắn sự cố."
                                        subtitle="Hiện hành · Không gồm phiếu vật tư bảo trì"
                                    />
                                    <KpiMetricTile
                                        label="Hoàn thành đúng hạn"
                                        value={off.onTimeRate}
                                        unit="%"
                                        tone={getRateTone(off.onTimeRate)}
                                        tooltip="Theo ngày hoàn thành trong kỳ: completed_at <= due_date trên các đầu việc có hạn chót."
                                        subtitle={
                                            off.completedWithDueDateInPeriod > 0
                                                ? `${off.completedOnTimeInPeriod}/${off.completedWithDueDateInPeriod} việc hoàn thành trước hạn`
                                                : undefined
                                        }
                                        unavailableReason="Chưa có đầu việc có hạn chót hoàn thành trong kỳ"
                                    />
                                </div>

                                <div className="cms-panel flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 text-[13px] sm:px-5">
                                    <div className="text-[var(--text-secondary)]">
                                        Lưu lượng {PERIOD_LABELS[period]}:{' '}
                                        <strong className="tabular-nums text-[var(--brand-primary)]">{off.createdInPeriod}</strong> tạo mới ·{' '}
                                        <strong className="tabular-nums text-[var(--status-success)]">{off.completedInPeriod}</strong> hoàn thành
                                    </div>
                                    <div className="text-[var(--text-secondary)]">
                                        Tuân thủ SLA:{' '}
                                        <strong className="tabular-nums text-[var(--text-primary)]">
                                            {off.sla.complianceRate !== null
                                                ? `${off.sla.complianceRate}% (${off.sla.metCount} đạt / ${off.sla.breachedCount} trễ)`
                                                : 'Chưa có bản ghi SLA'}
                                        </strong>{' '}
                                        · <span className="tabular-nums text-[var(--status-warning)]">{off.sla.atRiskCount}</span> sắp hết hạn
                                    </div>
                                </div>
                            </>
                        )}

                        {scope === 'industrial' && !ind && (
                            <EmptyState embedded title="Dữ liệu Thiết bị & Sự cố chưa sẵn sàng" />
                        )}

                        {scope === 'industrial' && ind && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <KpiMetricTile
                                    label="Thiết bị sẵn sàng"
                                    value={ind.assetsByStatus.total > 0 ? ind.assetsByStatus.OPERATIONAL : null}
                                    unit={ind.assetsByStatus.total > 0 ? `/ ${ind.assetsByStatus.total}` : undefined}
                                    tone={ind.assetsByStatus.FAULTY > 0 ? 'warning' : 'success'}
                                    tooltip="Trạng thái thiết bị hiện hành (OPERATIONAL / tổng thiết bị trong phạm vi)."
                                    subtitle={`${ind.assetsByStatus.MAINTENANCE} bảo trì · ${ind.assetsByStatus.FAULTY} sự cố · ${ind.assetsByStatus.DECOMMISSIONED} ngưng dùng`}
                                    unavailableReason="Chưa có thiết bị thuộc phạm vi"
                                />
                                <KpiMetricTile
                                    label="Sự cố chưa xử lý"
                                    value={ind.incidents.openTotal}
                                    tone={ind.incidents.openCritical > 0 ? 'danger' : ind.incidents.openTotal > 0 ? 'warning' : 'success'}
                                    tooltip="Số sự cố hiện chưa đóng (tồn đọng) kèm số sự cố đã giải quyết theo kỳ lọc."
                                    subtitle={`Hiện hành: ${ind.incidents.openCritical} khẩn cấp · ${ind.incidents.openHigh} cao · Đóng kỳ này: ${ind.incidents.resolvedInPeriod}`}
                                />
                                <KpiMetricTile
                                    label="Thời gian xử lý TB sự cố"
                                    value={ind.downtime.avgElapsedResolutionMinutes}
                                    unit="phút"
                                    tone="neutral"
                                    tooltip={ind.downtime.repairDurationReason}
                                    subtitle={
                                        ind.incidents.resolvedInPeriod > 0
                                            ? `Tổng ${ind.incidents.resolvedInPeriod} sự cố đã đóng: ${formatDuration(ind.downtime.totalElapsedMinutes)}`
                                            : undefined
                                    }
                                    unavailableReason="Chưa có sự cố đã đóng trong kỳ"
                                />
                                <KpiMetricTile
                                    label="Tuân thủ Kiểm tra Hiện trường"
                                    value={ind.inspections.passRate}
                                    unit="%"
                                    tone={
                                        ind.inspections.passRate === null
                                            ? 'neutral'
                                            : ind.inspections.failCount > 0
                                            ? 'warning'
                                            : 'success'
                                    }
                                    subtitle={
                                        ind.inspections.totalRunsInPeriod > 0
                                            ? `${ind.inspections.passCount} đạt · ${ind.inspections.failCount} không đạt (${ind.inspections.totalRunsInPeriod} lượt)`
                                            : undefined
                                    }
                                    unavailableReason="Chưa có lượt kiểm tra trong kỳ"
                                />
                            </div>
                        )}
                    </section>

                    {/* AREA C: PHÂN BỔ THEO PHÒNG BAN & THIẾT BỊ */}
                    <section aria-label="Phân bổ theo Phòng ban" className="space-y-4">
                        <div className="cms-panel p-4 sm:p-5">
                            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="m-0 text-[15px] font-bold text-[var(--text-primary)]">
                                        Phân bổ theo Phòng ban
                                    </h2>
                                    <p className="mt-1 mb-0 text-[13px] text-[var(--text-muted)]">
                                        Tách nhóm cột Công việc & Đề xuất và Thiết bị & Sự cố; nhấn dấu + để xem trưởng bộ phận và chi tiết đơn vị.
                                    </p>
                                </div>
                                <Link
                                    to="/departments"
                                    className="text-[13px] font-semibold text-[var(--brand-primary)] no-underline hover:underline"
                                >
                                    Quản lý Cơ cấu Phòng ban →
                                </Link>
                            </div>

                            {overview.departments.length === 0 ? (
                                <EmptyState
                                    embedded
                                    title="Không có dữ liệu phòng ban trong phạm vi"
                                    description="Kiểm tra phân công phòng ban hoặc chọn lại Workspace."
                                />
                            ) : (
                                <DataTable
                                    rowKey="department_id"
                                    dataSource={overview.departments}
                                    columns={departmentColumns}
                                    bordered
                                    pagination={false}
                                    expandable={{
                                        expandedRowRender: (row) => (
                                            <div className="flex flex-wrap items-center justify-between gap-4 bg-[var(--surface-subtle)] px-3 py-2 text-[13px]">
                                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[var(--text-secondary)]">
                                                    <span>
                                                        Mã đơn vị: <strong className="font-mono-code text-[var(--text-primary)]">{row.code}</strong>
                                                    </span>
                                                    <span>
                                                        Trưởng bộ phận:{' '}
                                                        <strong className="text-[var(--text-primary)]">
                                                            {row.manager_name || 'Chưa chỉ định'}
                                                        </strong>
                                                    </span>
                                                    <span>
                                                        Nhân sự hoạt động:{' '}
                                                        <strong className="tabular-nums text-[var(--text-primary)]">{row.active_members}</strong>
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <Button
                                                        size="small"
                                                        type={departmentId === row.department_id ? 'default' : 'link'}
                                                        className={departmentId === row.department_id ? '' : 'px-0 font-semibold'}
                                                        onClick={() =>
                                                            setDepartmentId(
                                                                departmentId === row.department_id ? null : row.department_id
                                                            )
                                                        }
                                                    >
                                                        {departmentId === row.department_id
                                                            ? 'Bỏ lọc phòng ban này'
                                                            : 'Lọc Dashboard theo phòng ban này'}
                                                    </Button>
                                                    <Link
                                                        to="/departments"
                                                        className="font-semibold text-[var(--brand-primary)] no-underline hover:underline"
                                                    >
                                                        Quản lý cơ cấu phòng ban
                                                    </Link>
                                                </div>
                                            </div>
                                        ),
                                    }}
                                />
                            )}
                        </div>

                        {scope === 'industrial' && ind && (
                            <div className="cms-panel p-4 sm:p-5">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="m-0 text-[15px] font-bold text-[var(--text-primary)]">
                                            Thiết bị phát sinh gián đoạn trong kỳ ({PERIOD_LABELS[period]})
                                        </h2>
                                        <p className="mt-1 mb-0 text-[13px] text-[var(--text-muted)]">
                                            Chỉ thống kê thiết bị có sự cố đã đóng trong kỳ. {ind.downtime.repairDurationReason}
                                        </p>
                                    </div>
                                    <Link
                                        to="/assets"
                                        className="text-[13px] font-semibold text-[var(--brand-primary)] no-underline hover:underline"
                                    >
                                        Mở Danh mục Thiết bị →
                                    </Link>
                                </div>

                                {ind.topDowntimeAssets.length === 0 ? (
                                    <EmptyState
                                        embedded
                                        title="Chưa ghi nhận thời gian dừng máy trong kỳ"
                                        description="Không có sự cố đã đóng gắn với thiết bị trong khoảng thời gian đã chọn."
                                    />
                                ) : (
                                    <DataTable
                                        rowKey="asset_id"
                                        dataSource={ind.topDowntimeAssets}
                                        columns={topAssetColumns}
                                        pagination={false}
                                    />
                                )}
                            </div>
                        )}
                    </section>

                    {/* AREA D: TỔNG HỢP DỮ KIỆN & KHUYẾN NGHỊ (COLLAPSIBLE COMPACT PANEL) */}
                    {scope !== 'office' && (
                        <section aria-label="Tổng hợp dữ kiện và Khuyến nghị" className="cms-panel">
                            <Collapse
                                ghost
                                defaultActiveKey={[]}
                                items={[
                                    {
                                        key: 'insights',
                                        label: (
                                            <div className="flex flex-col gap-1 py-0.5 pr-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {aiData?.analysisSource === 'llm' ? (
                                                        <Bot size={16} className="text-[var(--brand-primary)]" aria-hidden="true" />
                                                    ) : (
                                                        <Database size={16} className="text-[var(--text-secondary)]" aria-hidden="true" />
                                                    )}
                                                    <span className="text-[15px] font-bold text-[var(--text-primary)]">
                                                        Tổng hợp Dữ kiện & Khuyến nghị
                                                    </span>
                                                    <Tag color={aiError ? 'red' : aiData?.analysisSource === 'llm' ? 'blue' : 'default'} className="m-0">
                                                        {aiError
                                                            ? 'Lỗi tải dữ kiện'
                                                            : aiData?.analysisSource === 'llm'
                                                            ? 'AI Groq'
                                                            : 'Tổng hợp DB'}
                                                    </Tag>
                                                </div>
                                                {aiError ? (
                                                    <span className="text-[13px] font-medium text-[var(--status-danger)]">
                                                        {aiError} — Nhấn để xem chi tiết hoặc bấm Làm mới.
                                                    </span>
                                                ) : cleanedSummary ? (
                                                    <span className="text-[13px] font-normal text-[var(--text-muted)]">
                                                        {cleanedSummary}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ),
                                        children: aiError ? (
                                            <Alert
                                                type="warning"
                                                showIcon
                                                title="Không thể tải dữ liệu phân tích"
                                                description={aiError}
                                                action={
                                                    <Button size="small" onClick={loadDashboard}>
                                                        Thử lại
                                                    </Button>
                                                }
                                            />
                                        ) : !aiData ? (
                                            <LoadingState rows={3} />
                                        ) : (
                                            <div className="space-y-4 pt-1">
                                                {!aiData.llmConfigured && (
                                                    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                                                        <Info size={14} className="shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
                                                        <span>
                                                            Chế độ tổng hợp trực tiếp từ cơ sở dữ liệu (chưa bật LLM) nên không suy đoán nguyên nhân kỹ thuật chưa kiểm chứng.
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                                    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                                                        <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[13px] font-bold text-[var(--text-primary)]">
                                                            <CheckCircle2 size={15} className="text-[var(--status-success)]" aria-hidden="true" />
                                                            Dữ kiện đã xác minh
                                                        </h3>
                                                        <ul className="m-0 list-disc space-y-1.5 pl-4 text-[13px] text-[var(--text-secondary)]">
                                                            {insightsFacts.map((f, idx) => (
                                                                <li key={idx}>{stripMarkdownTokens(f)}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                                                        <h3 className="m-0 mb-2 flex items-center gap-1.5 text-[13px] font-bold text-[var(--text-primary)]">
                                                            <AlertTriangle size={15} className="text-[var(--status-warning)]" aria-hidden="true" />
                                                            Giả thuyết có thể (Tham khảo)
                                                        </h3>
                                                        {insightsCauses.length > 0 ? (
                                                            <ul className="m-0 list-disc space-y-1.5 pl-4 text-[13px] text-[var(--text-secondary)]">
                                                                {insightsCauses.map((c, idx) => (
                                                                    <li key={idx}>{stripMarkdownTokens(c)}</li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="m-0 text-[13px] text-[var(--text-muted)]">
                                                                Không có giả thuyết suy đoán. Xem chi tiết từng sự cố để xác định nguyên nhân kỹ thuật thực tế.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                                                        <h3 className="m-0 mb-2 text-[13px] font-bold text-[var(--text-primary)]">
                                                            Khuyến nghị hành động
                                                        </h3>
                                                        <ul className="m-0 list-disc space-y-1.5 pl-4 text-[13px] text-[var(--text-secondary)]">
                                                            {insightsRecommendations.map((r, idx) => (
                                                                <li key={idx}>{stripMarkdownTokens(r)}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
