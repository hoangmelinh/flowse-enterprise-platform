import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Checkbox, Form, Input, Modal, Select, Tabs, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
    createInspectionTemplate,
    getAssets,
    getInspectionDetail,
    getInspectionRuns,
    getInspectionTemplates,
    updateInspectionTemplate,
    type CmsAsset,
    type CmsInspectionItem,
    type CmsInspectionRun,
    type CmsInspectionTemplate,
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
    StatusBadge,
} from '@/components/ui';

export default function InspectionsAdminPage() {
    const { currentWorkspaceId, currentRole, capabilities } = useCmsAuth();
    const canManageInspections = Boolean(capabilities.can_manage_inspections);

    const [searchParams, setSearchParams] = useSearchParams();
    const activeTabParam = searchParams.get('tab') === 'runs' ? 'runs' : 'templates';
    const runStatusParam = searchParams.get('status') || 'ALL';

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [templates, setTemplates] = useState<CmsInspectionTemplate[]>([]);
    const [runs, setRuns] = useState<CmsInspectionRun[]>([]);
    const [assets, setAssets] = useState<CmsAsset[]>([]);
    const [activeTab, setActiveTab] = useState<string>(activeTabParam);
    const [runStatusFilter, setRunStatusFilter] = useState<string>(runStatusParam);
    const [searchText, setSearchText] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<CmsInspectionTemplate | null>(null);
    const [items, setItems] = useState<CmsInspectionItem[]>([
        { question: '', require_evidence: false, fail_severity: 'HIGH' },
    ]);
    const [form] = Form.useForm();

    const loadData = useCallback(async () => {
        if (!currentWorkspaceId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setErrorMsg(null);
            const [tplRes, runRes, assetRes] = await Promise.all([
                getInspectionTemplates(),
                getInspectionRuns(currentWorkspaceId),
                getAssets(currentWorkspaceId),
            ]);
            setTemplates(tplRes?.data || []);
            setRuns(runRes?.data || []);
            setAssets(assetRes?.data || []);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Không thể tải dữ liệu kiểm tra');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentWorkspaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setItems([{ question: '', require_evidence: true, fail_severity: 'HIGH' }]);
        setModalOpen(true);
    };

    const openEdit = async (tpl: CmsInspectionTemplate) => {
        if (!tpl.asset_id) {
            message.warning('Mẫu checklist hệ thống dùng chung ở chế độ chỉ đọc.');
            return;
        }
        try {
            const detail = await getInspectionDetail(tpl.checklist_id);
            const full = detail?.data || tpl;
            setEditing(full);
            form.setFieldsValue({
                title: full.title,
                asset_id: full.asset_id ?? undefined,
                description: full.description || '',
                is_active: full.is_active ?? true,
            });
            setItems(
                full.items && full.items.length > 0
                    ? full.items
                    : [{ question: '', require_evidence: false, fail_severity: 'MEDIUM' }]
            );
            setModalOpen(true);
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể tải chi tiết mẫu checklist'));
        }
    };

    const handleSaveTemplate = async (values: {
        title: string;
        asset_id?: number | null;
        description?: string;
        is_active?: boolean;
    }) => {
        const cleanItems = items.filter((i) => i.question.trim().length > 0);
        if (cleanItems.length === 0) {
            message.warning('Vui lòng thêm ít nhất 1 hạng mục kiểm tra');
            return;
        }
        try {
            setSaving(true);
            if (editing) {
                await updateInspectionTemplate(editing.checklist_id, {
                    ...values,
                    asset_id: values.asset_id ?? undefined,
                    items: cleanItems,
                });
                message.success('Đã cập nhật mẫu checklist');
            } else {
                await createInspectionTemplate({
                    ...values,
                    asset_id: values.asset_id ?? undefined,
                    items: cleanItems,
                });
                message.success('Đã tạo mẫu checklist mới');
            }
            setModalOpen(false);
            await loadData();
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể lưu mẫu checklist'));
        } finally {
            setSaving(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) return templates;
        return templates.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                (t.asset_code || '').toLowerCase().includes(q) ||
                (t.asset_name || '').toLowerCase().includes(q)
        );
    }, [templates, searchText]);

    const filteredRuns = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return runs.filter((r) => {
            if (runStatusFilter !== 'ALL' && r.overall_status !== runStatusFilter) return false;
            if (!q) return true;
            return (
                (r.checklist_title || '').toLowerCase().includes(q) ||
                (r.asset_code || '').toLowerCase().includes(q) ||
                (r.asset_name || '').toLowerCase().includes(q) ||
                (r.inspector_name || '').toLowerCase().includes(q)
            );
        });
    }, [runs, runStatusFilter, searchText]);

    const templateColumns: ColumnsType<CmsInspectionTemplate> = [
        {
            title: 'Tên mẫu kiểm tra',
            dataIndex: 'title',
            key: 'title',
            sorter: (a, b) => a.title.localeCompare(b.title, 'vi'),
            render: (t: string, r) => (
                <div>
                    <div className="font-semibold text-[var(--text-primary)]">{t}</div>
                    {r.description && <div className="text-xs text-[var(--text-muted)]">{r.description}</div>}
                </div>
            ),
        },
        {
            title: 'Phạm vi / Thiết bị áp dụng',
            key: 'asset',
            render: (_, r) =>
                r.asset_code ? (
                    <Tag color="blue" className="m-0 font-mono-code">
                        {r.asset_code} — {r.asset_name}
                    </Tag>
                ) : (
                    <StatusBadge value="SYSTEM" />
                ),
        },
        {
            title: 'Số hạng mục',
            dataIndex: 'item_count',
            key: 'item_count',
            align: 'right',
            width: 120,
            render: (c?: number | string) => <span className="tabular-nums font-medium">{Number(c || 0)} mục</span>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 130,
            render: (act: boolean) => <StatusBadge value={act ? 'ACTIVE' : 'INACTIVE'} labelOverride={act ? 'Đang áp dụng' : 'Tạm ngưng'} />,
        },
        ...(canManageInspections
            ? [
                  {
                      title: 'Thao tác',
                      key: 'action',
                      align: 'right' as const,
                      width: 130,
                      render: (_: unknown, r: CmsInspectionTemplate) =>
                          r.asset_id ? (
                              <Button size="small" icon={<Pencil size={12} />} onClick={() => openEdit(r)}>
                                  Chỉnh sửa
                              </Button>
                          ) : (
                              <Tooltip title="Mẫu dùng chung toàn hệ thống không được sửa từ cấp Workspace">
                                  <span className="text-xs text-[var(--text-muted)]">Chỉ đọc</span>
                              </Tooltip>
                          ),
                  },
              ]
            : []),
    ];

    const runColumns: ColumnsType<CmsInspectionRun> = [
        {
            title: 'Run #',
            dataIndex: 'run_id',
            key: 'run_id',
            width: 90,
            render: (id: number) => <span className="font-mono-code text-xs font-semibold">#{id}</span>,
        },
        {
            title: 'Checklist & Thiết bị',
            key: 'info',
            render: (_, r) => (
                <div>
                    <div className="font-semibold text-[var(--text-primary)]">
                        {r.checklist_title || `Checklist #${r.checklist_id}`}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                        {r.asset_code ? `${r.asset_code} — ${r.asset_name}` : 'Không gắn thiết bị'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Kết quả',
            dataIndex: 'overall_status',
            key: 'overall_status',
            width: 190,
            render: (st: string, r) => (
                <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge value={st} />
                    <span className="tabular-nums text-xs text-[var(--text-muted)]">
                        ({r.failed_count || 0}/{r.total_count || 0} lỗi)
                    </span>
                </div>
            ),
        },
        {
            title: 'Người kiểm tra',
            key: 'inspector',
            render: (_, r) => (
                <div className="text-xs">
                    <div className="font-semibold text-[var(--text-primary)]">{r.inspector_name || 'N/A'}</div>
                    <div className="text-[var(--text-muted)]">{r.inspector_email}</div>
                </div>
            ),
        },
        {
            title: 'Thời gian hoàn tất',
            key: 'time',
            width: 165,
            render: (_, r) =>
                r.completed_at || r.started_at
                    ? dayjs(r.completed_at || r.started_at).format('DD/MM/YYYY HH:mm')
                    : '—',
        },
    ];

    return (
        <div>
            <PageHeader
                title="Mẫu Kiểm tra & Lịch sử Tuân thủ"
                description="Quản lý bộ checklist kiểm tra cho từng thiết bị thuộc Workspace và rà soát lịch sử PASS/FAIL từ hiện trường."
                meta={<StatusBadge value={currentRole} />}
                actions={
                    <>
                        <Button icon={<RefreshCw size={14} />} onClick={loadData} loading={loading}>
                            Làm mới
                        </Button>
                        {canManageInspections && (
                            <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
                                Tạo mẫu Checklist
                            </Button>
                        )}
                    </>
                }
            />

            {!currentWorkspaceId ? (
                <EmptyState title="Chưa chọn Workspace" description="Vui lòng chọn Workspace ở thanh tiêu đề." />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadData} />
            ) : (
                <div className="cms-panel p-4 sm:p-5">
                    <Tabs
                        activeKey={activeTab}
                        onChange={(k) => {
                            setActiveTab(k);
                            const next = new URLSearchParams(searchParams);
                            if (k === 'templates') next.delete('tab');
                            else next.set('tab', k);
                            setSearchParams(next, { replace: true });
                        }}
                        items={[
                            {
                                key: 'templates',
                                label: `Bộ mẫu Checklist (${templates.length})`,
                                children: (
                                    <div className="space-y-4">
                                        <FilterBar
                                            className="mb-2 border-none bg-[var(--surface-subtle)]"
                                            left={
                                                <Input.Search
                                                    allowClear
                                                    placeholder="Tìm tên checklist hoặc mã thiết bị..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    className="w-72"
                                                />
                                            }
                                            right={
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    Mẫu hệ thống dùng chung ở chế độ chỉ đọc; mẫu gắn thiết bị thuộc quyền Admin Workspace.
                                                </span>
                                            }
                                        />
                                        {loading ? (
                                            <LoadingState rows={4} />
                                        ) : filteredTemplates.length === 0 ? (
                                            <EmptyState embedded title="Chưa có mẫu checklist phù hợp" />
                                        ) : (
                                            <DataTable
                                                rowKey="checklist_id"
                                                dataSource={filteredTemplates}
                                                columns={templateColumns}
                                                pagination={{ pageSize: 10 }}
                                            />
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'runs',
                                label: `Lịch sử Chạy kiểm tra Hiện trường (${runs.length})`,
                                children: (
                                    <div className="space-y-4">
                                        <FilterBar
                                            className="mb-2 border-none bg-[var(--surface-subtle)]"
                                            left={
                                                <>
                                                    <Input.Search
                                                        allowClear
                                                        placeholder="Tìm checklist, thiết bị hoặc người kiểm tra..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        className="w-64 sm:w-72"
                                                    />
                                                    <Select
                                                        aria-label="Lọc kết quả kiểm tra"
                                                        value={runStatusFilter}
                                                        onChange={(val) => {
                                                            setRunStatusFilter(val);
                                                            const next = new URLSearchParams(searchParams);
                                                            if (val === 'ALL') next.delete('status');
                                                            else next.set('status', val);
                                                            setSearchParams(next, { replace: true });
                                                        }}
                                                        className="w-52"
                                                        options={[
                                                            { label: 'Mọi kết quả kiểm tra', value: 'ALL' },
                                                            { label: 'Chỉ lượt ĐẠT (PASS)', value: 'PASS' },
                                                            { label: 'Chỉ lượt KHÔNG ĐẠT (FAIL)', value: 'FAIL' },
                                                        ]}
                                                    />
                                                </>
                                            }
                                            right={
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    Hiển thị {filteredRuns.length}/{runs.length} lượt kiểm tra
                                                </span>
                                            }
                                        />
                                        {loading ? (
                                            <LoadingState rows={4} />
                                        ) : filteredRuns.length === 0 ? (
                                            <EmptyState embedded title="Chưa ghi nhận lượt kiểm tra nào phù hợp bộ lọc" />
                                        ) : (
                                            <DataTable
                                                rowKey="run_id"
                                                dataSource={filteredRuns}
                                                columns={runColumns}
                                                pagination={{ pageSize: 12 }}
                                            />
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            <Modal
                title={editing ? `Cập nhật mẫu Checklist #${editing.checklist_id}` : 'Tạo mẫu Checklist cho Thiết bị'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                width={720}
                okText="Lưu mẫu Checklist"
                cancelText="Hủy"
            >
                <Alert
                    type="info"
                    showIcon
                    className="mb-3"
                    title="Mẫu checklist mới bắt buộc gắn với thiết bị thuộc Workspace hiện tại để đảm bảo cô lập dữ liệu."
                />
                <Form form={form} layout="vertical" onFinish={handleSaveTemplate}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Form.Item
                            name="title"
                            label="Tên bộ tiêu chuẩn kiểm tra"
                            rules={[{ required: true, message: 'Vui lòng nhập tên checklist' }]}
                        >
                            <Input placeholder="VD: Kiểm tra an toàn đầu ca CNC" />
                        </Form.Item>
                        <Form.Item
                            name="asset_id"
                            label="Thiết bị áp dụng"
                            rules={[{ required: true, message: 'Bắt buộc chọn thiết bị thuộc Workspace' }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Chọn thiết bị thuộc Workspace"
                                options={assets.map((a) => ({
                                    label: `${a.asset_code} — ${a.name}`,
                                    value: a.asset_id,
                                }))}
                            />
                        </Form.Item>
                    </div>
                    <Form.Item name="description" label="Hướng dẫn kiểm tra">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-secondary)]">
                            Danh sách hạng mục ({items.length})
                        </span>
                        <Button
                            size="small"
                            icon={<Plus size={12} />}
                            onClick={() =>
                                setItems((prev) => [
                                    ...prev,
                                    { question: '', require_evidence: false, fail_severity: 'HIGH' },
                                ])
                            }
                        >
                            Thêm hạng mục
                        </Button>
                    </div>

                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2.5"
                            >
                                <span className="w-5 text-xs font-bold text-[var(--text-muted)]">{idx + 1}.</span>
                                <Input
                                    value={item.question}
                                    onChange={(e) =>
                                        setItems((prev) =>
                                            prev.map((it, i) => (i === idx ? { ...it, question: e.target.value } : it))
                                        )
                                    }
                                    placeholder="Nội dung kiểm tra..."
                                    className="min-w-48 flex-1"
                                />
                                <Select
                                    value={item.fail_severity}
                                    onChange={(val) =>
                                        setItems((prev) =>
                                            prev.map((it, i) => (i === idx ? { ...it, fail_severity: val } : it))
                                        )
                                    }
                                    className="w-28"
                                    options={[
                                        { label: 'CRITICAL', value: 'CRITICAL' },
                                        { label: 'HIGH', value: 'HIGH' },
                                        { label: 'MEDIUM', value: 'MEDIUM' },
                                        { label: 'LOW', value: 'LOW' },
                                    ]}
                                />
                                <Checkbox
                                    checked={item.require_evidence}
                                    onChange={(e) =>
                                        setItems((prev) =>
                                            prev.map((it, i) =>
                                                i === idx ? { ...it, require_evidence: e.target.checked } : it
                                            )
                                        )
                                    }
                                >
                                    Bắt ảnh
                                </Checkbox>
                                <Button
                                    size="small"
                                    danger
                                    aria-label={`Xóa hạng mục ${idx + 1}`}
                                    icon={<Trash2 size={12} />}
                                    disabled={items.length <= 1}
                                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                                />
                            </div>
                        ))}
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
