import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Form, Input, Modal, QRCode, Select, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Activity, Pencil, Plus, Printer, QrCode, RefreshCw, RotateCcw } from 'lucide-react';
import {
    createAsset,
    getAssetHealthRecord,
    getAssets,
    getDepartments,
    rotateAssetQr,
    updateAsset,
    type AssetHealthRecordData,
    type AssetStatus,
    type CmsAsset,
    type CmsDepartment,
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
    confirmAction,
} from '@/components/ui';

const VALID_STATUSES: Array<{ value: AssetStatus; label: string }> = [
    { value: 'OPERATIONAL', label: 'OPERATIONAL — Đang hoạt động' },
    { value: 'MAINTENANCE', label: 'MAINTENANCE — Đang bảo trì' },
    { value: 'FAULTY', label: 'FAULTY — Gặp sự cố' },
    { value: 'DECOMMISSIONED', label: 'DECOMMISSIONED — Ngưng sử dụng' },
];

export default function AssetsRegistryPage() {
    const { currentWorkspaceId, currentRole, capabilities } = useCmsAuth();
    const canManageAssets = Boolean(capabilities.can_manage_assets);

    const [searchParams, setSearchParams] = useSearchParams();
    const initialStatus = searchParams.get('status') || 'ALL';
    const deptParam = searchParams.get('departmentId');
    const initialDeptId = deptParam && Number.isFinite(Number(deptParam)) ? Number(deptParam) : null;

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [assets, setAssets] = useState<CmsAsset[]>([]);
    const [departments, setDepartments] = useState<CmsDepartment[]>([]);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
    const [departmentFilter, setDepartmentFilter] = useState<number | null>(initialDeptId);

    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingAsset, setEditingAsset] = useState<CmsAsset | null>(null);
    const [form] = Form.useForm();

    const [qrAsset, setQrAsset] = useState<CmsAsset | null>(null);
    const [rotatingId, setRotatingId] = useState<number | null>(null);

    const [healthOpen, setHealthOpen] = useState(false);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthRecord, setHealthRecord] = useState<AssetHealthRecordData | null>(null);

    const loadData = useCallback(async () => {
        if (!currentWorkspaceId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setErrorMsg(null);
            const [assetRes, deptRes] = await Promise.all([
                getAssets(currentWorkspaceId),
                getDepartments(currentWorkspaceId),
            ]);
            setAssets(assetRes?.data || []);
            setDepartments(deptRes?.data || []);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Không thể tải danh mục thiết bị');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentWorkspaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredAssets = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return assets.filter((a) => {
            if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
            if (departmentFilter !== null && a.department_id !== departmentFilter) return false;
            if (!q) return true;
            return (
                a.asset_code.toLowerCase().includes(q) ||
                a.name.toLowerCase().includes(q) ||
                (a.location || '').toLowerCase().includes(q) ||
                (a.department_name || '').toLowerCase().includes(q)
            );
        });
    }, [assets, statusFilter, departmentFilter, searchText]);

    const openCreate = () => {
        setEditingAsset(null);
        form.resetFields();
        form.setFieldsValue({ status: 'OPERATIONAL' });
        setFormOpen(true);
    };

    const openEdit = (asset: CmsAsset) => {
        setEditingAsset(asset);
        form.setFieldsValue({
            asset_code: asset.asset_code,
            name: asset.name,
            location: asset.location || '',
            department_id: asset.department_id ?? undefined,
            status: asset.status,
            manufacturer: asset.specs?.manufacturer || '',
            model: asset.specs?.model || '',
            serial_number: asset.specs?.serial_number || '',
            description: asset.specs?.notes || '',
        });
        setFormOpen(true);
    };

    const handleSaveAsset = async (values: {
        asset_code: string;
        name: string;
        location?: string;
        department_id?: number;
        status: AssetStatus;
        manufacturer?: string;
        model?: string;
        serial_number?: string;
        description?: string;
    }) => {
        try {
            setSaving(true);
            const payload = {
                asset_code: values.asset_code.trim().toUpperCase(),
                name: values.name.trim(),
                location: values.location?.trim() || undefined,
                department_id: values.department_id ?? null,
                status: values.status,
                manufacturer: values.manufacturer?.trim() || undefined,
                model: values.model?.trim() || undefined,
                serial_number: values.serial_number?.trim() || undefined,
                description: values.description?.trim() || undefined,
            };
            if (editingAsset) {
                await updateAsset(editingAsset.asset_id, payload);
                message.success('Đã cập nhật thiết bị');
            } else {
                await createAsset(payload);
                message.success('Đã khai báo thiết bị mới kèm mã QR');
            }
            setFormOpen(false);
            await loadData();
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể lưu thiết bị'));
        } finally {
            setSaving(false);
        }
    };

    const handleRotateQr = (asset: CmsAsset) => {
        confirmAction({
            title: `Cấp lại mã QR cho ${asset.asset_code}`,
            content: 'Xoay vòng QR token sẽ làm tem QR cũ dán trên thiết bị hết hiệu lực và yêu cầu in lại tem mới.',
            okText: 'Cấp lại QR',
            danger: true,
            onConfirm: async () => {
                try {
                    setRotatingId(asset.asset_id);
                    const res = await rotateAssetQr(asset.asset_id);
                    if (res?.data) {
                        setQrAsset(res.data);
                    }
                    message.success(`Đã cấp lại QR Token mới cho ${asset.asset_code}`);
                    await loadData();
                } catch (err: unknown) {
                    message.error(getApiErrorMessage(err, 'Không thể xoay vòng QR token'));
                } finally {
                    setRotatingId(null);
                }
            },
        });
    };

    const openHealthDrawer = async (asset: CmsAsset) => {
        setHealthOpen(true);
        setHealthLoading(true);
        try {
            const res = await getAssetHealthRecord(asset.asset_id);
            setHealthRecord(res?.data || null);
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể tải hồ sơ sức khỏe thiết bị'));
            setHealthOpen(false);
        } finally {
            setHealthLoading(false);
        }
    };

    const columns: ColumnsType<CmsAsset> = [
        {
            title: 'Mã & Tên thiết bị',
            key: 'name',
            sorter: (a, b) => a.asset_code.localeCompare(b.asset_code),
            render: (_, record) => (
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[var(--brand-primary-soft)] px-1.5 py-0.5 font-mono-code text-xs font-bold text-[var(--brand-primary)]">
                            {record.asset_code}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">{record.name}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {record.location || 'Chưa rõ vị trí'} · {record.department_name || 'Dùng chung Workspace'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 165,
            render: (st: string) => <StatusBadge value={st} />,
        },
        {
            title: 'Health Score',
            dataIndex: 'health_score',
            key: 'health_score',
            align: 'right',
            width: 120,
            sorter: (a, b) => (a.health_score ?? 100) - (b.health_score ?? 100),
            render: (score?: number) => {
                const val = score ?? 100;
                return (
                    <Tag color={val >= 80 ? 'green' : val >= 50 ? 'gold' : 'red'} className="m-0 tabular-nums font-semibold">
                        {val} / 100
                    </Tag>
                );
            },
        },
        {
            title: 'Sự cố',
            dataIndex: 'incident_count',
            key: 'incident_count',
            align: 'right',
            width: 95,
            sorter: (a, b) => Number(a.incident_count || 0) - Number(b.incident_count || 0),
            render: (c?: number | string) => <span className="tabular-nums font-medium">{Number(c || 0)}</span>,
        },
        {
            title: 'Thao tác',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button size="small" icon={<Activity size={12} />} onClick={() => openHealthDrawer(record)}>
                        Hồ sơ
                    </Button>
                    <Button size="small" icon={<QrCode size={12} />} onClick={() => setQrAsset(record)}>
                        In Tem QR
                    </Button>
                    {canManageAssets && (
                        <>
                            <Button size="small" icon={<Pencil size={12} />} onClick={() => openEdit(record)}>
                                Sửa
                            </Button>
                            <Button
                                size="small"
                                loading={rotatingId === record.asset_id}
                                icon={<RotateCcw size={12} />}
                                onClick={() => handleRotateQr(record)}
                            >
                                Đổi QR
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div>
            <PageHeader
                title="Danh mục Thiết bị & Tem QR"
                description="Quản trị lý lịch thiết bị theo Workspace & Phòng ban, theo dõi Health Score và cấp/xoay vòng tem QR định danh."
                meta={<StatusBadge value={currentRole} />}
                actions={
                    <>
                        <Button icon={<RefreshCw size={14} />} onClick={loadData} loading={loading}>
                            Làm mới
                        </Button>
                        {canManageAssets && (
                            <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
                                Thêm thiết bị mới
                            </Button>
                        )}
                    </>
                }
            />

            <FilterBar
                left={
                    <>
                        <Input.Search
                            allowClear
                            placeholder="Tìm mã thiết bị, tên máy hoặc vị trí..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-64 sm:w-72"
                        />
                        <Select
                            aria-label="Lọc trạng thái thiết bị"
                            value={statusFilter}
                            onChange={(val) => {
                                setStatusFilter(val);
                                const next = new URLSearchParams(searchParams);
                                if (val === 'ALL') next.delete('status');
                                else next.set('status', val);
                                setSearchParams(next, { replace: true });
                            }}
                            className="w-48"
                            options={[
                                { label: 'Mọi trạng thái', value: 'ALL' },
                                { label: 'Đang hoạt động', value: 'OPERATIONAL' },
                                { label: 'Đang bảo trì', value: 'MAINTENANCE' },
                                { label: 'Gặp sự cố (FAULTY)', value: 'FAULTY' },
                                { label: 'Ngưng sử dụng', value: 'DECOMMISSIONED' },
                            ]}
                        />
                        <Select
                            allowClear
                            aria-label="Lọc phòng ban quản lý"
                            placeholder="Tất cả phòng ban"
                            value={departmentFilter ?? undefined}
                            onChange={(val) => {
                                const nextId = val ? Number(val) : null;
                                setDepartmentFilter(nextId);
                                const next = new URLSearchParams(searchParams);
                                if (nextId === null) next.delete('departmentId');
                                else next.set('departmentId', String(nextId));
                                setSearchParams(next, { replace: true });
                            }}
                            className="w-52"
                            options={departments.map((d) => ({
                                label: `${d.code} — ${d.name}`,
                                value: d.id || d.department_id,
                            }))}
                        />
                    </>
                }
                right={
                    <span className="text-xs text-[var(--text-muted)]">
                        Hiển thị {filteredAssets.length}/{assets.length} thiết bị
                    </span>
                }
            />

            {!currentWorkspaceId ? (
                <EmptyState title="Chưa chọn Workspace" description="Vui lòng chọn Workspace ở thanh tiêu đề." />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadData} />
            ) : loading ? (
                <LoadingState rows={5} />
            ) : filteredAssets.length === 0 ? (
                <EmptyState
                    title="Không có thiết bị phù hợp bộ lọc"
                    description={statusFilter !== 'ALL' ? `Không có thiết bị ở trạng thái ${statusFilter}.` : 'Workspace này chưa khai báo thiết bị nào.'}
                />
            ) : (
                <div className="cms-panel p-4 sm:p-5">
                    <DataTable
                        rowKey="asset_id"
                        dataSource={filteredAssets}
                        columns={columns}
                        pagination={{ pageSize: 10 }}
                    />
                </div>
            )}

            <Modal
                title={editingAsset ? `Chỉnh sửa thiết bị ${editingAsset.asset_code}` : 'Khai báo thiết bị mới'}
                open={formOpen}
                onCancel={() => setFormOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText={editingAsset ? 'Lưu thay đổi' : 'Tạo thiết bị'}
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleSaveAsset} className="mt-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Form.Item
                            name="asset_code"
                            label="Mã thiết bị"
                            rules={[{ required: true, message: 'Bắt buộc nhập mã' }]}
                        >
                            <Input className="font-mono-code" placeholder="CNC-024" />
                        </Form.Item>
                        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                            <Select options={VALID_STATUSES} />
                        </Form.Item>
                    </div>
                    <Form.Item
                        name="name"
                        label="Tên thiết bị"
                        rules={[{ required: true, message: 'Bắt buộc nhập tên thiết bị' }]}
                    >
                        <Input placeholder="VD: Máy phay CNC 5 trục Fanuc" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Form.Item name="location" label="Vị trí lắp đặt">
                            <Input placeholder="Xưởng A - Line 2" />
                        </Form.Item>
                        <Form.Item name="department_id" label="Đơn vị quản lý">
                            <Select
                                allowClear
                                placeholder="Chọn phòng ban"
                                options={departments.map((d) => ({
                                    label: `${d.code} — ${d.name}`,
                                    value: d.id || d.department_id,
                                }))}
                            />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Form.Item name="manufacturer" label="Hãng SX">
                            <Input placeholder="Fanuc" />
                        </Form.Item>
                        <Form.Item name="model" label="Model">
                            <Input placeholder="Robodrill D21" />
                        </Form.Item>
                        <Form.Item name="serial_number" label="Serial">
                            <Input placeholder="SN-99201" />
                        </Form.Item>
                    </div>
                    <Form.Item name="description" label="Ghi chú kỹ thuật">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={qrAsset ? `Tem QR Thiết bị: ${qrAsset.asset_code}` : 'Tem QR'}
                open={Boolean(qrAsset)}
                onCancel={() => setQrAsset(null)}
                footer={[
                    <Button key="close" onClick={() => setQrAsset(null)}>
                        Đóng
                    </Button>,
                    <Button
                        key="print"
                        type="primary"
                        icon={<Printer size={14} />}
                        onClick={() => window.print()}
                    >
                        In tem dán thiết bị
                    </Button>,
                ]}
            >
                {qrAsset && (
                    <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-white p-6 text-center">
                        <QRCode value={qrAsset.qr_token} size={180} />
                        <div className="mt-3 font-mono-code text-base font-bold text-[var(--text-primary)]">
                            {qrAsset.asset_code}
                        </div>
                        <div className="text-sm font-semibold text-[var(--text-secondary)]">{qrAsset.name}</div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {qrAsset.location || 'Chưa rõ vị trí'} · {qrAsset.department_name || 'Dùng chung'}
                        </div>
                        <div className="mt-2 rounded bg-[var(--surface-subtle)] px-2 py-1 font-mono-code text-[11px] text-[var(--text-muted)]">
                            Token: {qrAsset.qr_token}
                        </div>
                    </div>
                )}
            </Modal>

            <SideDrawer
                title={healthRecord?.asset ? `Hồ sơ Sức khỏe: ${healthRecord.asset.asset_code}` : 'Hồ sơ Thiết bị'}
                open={healthOpen}
                onClose={() => setHealthOpen(false)}
            >
                {healthLoading || !healthRecord ? (
                    <LoadingState rows={5} />
                ) : (
                    <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4">
                            <div>
                                <div className="text-base font-bold text-[var(--text-primary)]">{healthRecord.asset?.name}</div>
                                <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                                    {healthRecord.asset?.location || 'Chưa cập nhật vị trí'}
                                </div>
                            </div>
                            <Tag
                                color={(healthRecord.asset?.health_score ?? 100) >= 80 ? 'green' : 'orange'}
                                className="m-0 px-3 py-1 text-sm font-bold"
                            >
                                Score: {healthRecord.asset?.health_score ?? 100}/100
                            </Tag>
                        </div>
                        <div>
                            <h3 className="mb-2.5 text-sm font-bold text-[var(--text-primary)]">
                                Nhật ký Sự cố &amp; Kiểm tra ({healthRecord.timeline?.length || 0})
                            </h3>
                            {(healthRecord.timeline || []).length === 0 ? (
                                <EmptyState embedded title="Chưa ghi nhận sự cố hoặc lượt kiểm tra nào" />
                            ) : (
                                <div className="space-y-2">
                                    {(healthRecord.timeline || []).slice(0, 15).map((ev, idx: number) => (
                                        <div
                                            key={idx}
                                            className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3 text-[13px]"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-[var(--text-primary)]">
                                                    {ev.title || ev.event_type}
                                                </span>
                                                {ev.created_at && (
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        {dayjs(ev.created_at).format('DD/MM/YYYY HH:mm')}
                                                    </span>
                                                )}
                                            </div>
                                            {ev.description && (
                                                <div className="mt-1 text-xs text-[var(--text-secondary)]">{ev.description}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </SideDrawer>
        </div>
    );
}
