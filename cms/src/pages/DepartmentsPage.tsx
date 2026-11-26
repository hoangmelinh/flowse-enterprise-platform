import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Select, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, FolderTree, Pencil, Plus, RefreshCw, Users } from 'lucide-react';
import {
    createDepartment,
    getDepartmentTree,
    getWorkspaceMembers,
    updateDepartment,
    type CmsDepartment,
    type CmsMember,
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

const flattenDepartments = (nodes: CmsDepartment[]): CmsDepartment[] => {
    const out: CmsDepartment[] = [];
    for (const n of nodes) {
        out.push(n);
        if (n.children && n.children.length > 0) {
            out.push(...flattenDepartments(n.children));
        }
    }
    return out;
};

const collectDescendantIds = (node: CmsDepartment): Set<number> => {
    const ids = new Set<number>();
    const walk = (n: CmsDepartment) => {
        const id = n.id || n.department_id;
        if (id) ids.add(id);
        (n.children || []).forEach(walk);
    };
    walk(node);
    return ids;
};

const filterDepartmentTree = (nodes: CmsDepartment[], query: string): CmsDepartment[] => {
    if (!query) return nodes;
    const q = query.toLowerCase();
    const res: CmsDepartment[] = [];
    for (const node of nodes) {
        const filteredChildren = node.children ? filterDepartmentTree(node.children, query) : [];
        const match =
            node.name.toLowerCase().includes(q) ||
            node.code.toLowerCase().includes(q) ||
            (node.manager_name || '').toLowerCase().includes(q);
        if (match || filteredChildren.length > 0) {
            res.push({
                ...node,
                children: filteredChildren.length > 0 ? filteredChildren : undefined,
            });
        }
    }
    return res;
};

export default function DepartmentsPage() {
    const { currentWorkspaceId, currentRole, capabilities, context } = useCmsAuth();
    const canManageDepartments = Boolean(capabilities.can_manage_departments);

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [tree, setTree] = useState<CmsDepartment[]>([]);
    const [flatList, setFlatList] = useState<CmsDepartment[]>([]);
    const [members, setMembers] = useState<CmsMember[]>([]);
    const [searchText, setSearchText] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<CmsDepartment | null>(null);
    const [inspectDept, setInspectDept] = useState<CmsDepartment | null>(null);
    const [form] = Form.useForm();

    const loadData = useCallback(async () => {
        if (!currentWorkspaceId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setErrorMsg(null);
            const [treeRes, memRes] = await Promise.all([
                getDepartmentTree(currentWorkspaceId),
                getWorkspaceMembers(currentWorkspaceId),
            ]);
            const treeData = treeRes?.data || [];
            setTree(treeData);
            setFlatList(flattenDepartments(treeData));
            setMembers(Array.isArray(memRes) ? memRes : []);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Không thể tải cơ cấu phòng ban');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentWorkspaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openCreate = (parentId?: number | null) => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue({ parent_id: parentId ?? null });
        setModalOpen(true);
    };

    const openEdit = (dept: CmsDepartment) => {
        setEditing(dept);
        form.setFieldsValue({
            name: dept.name,
            code: dept.code,
            parent_id: dept.parent_id ?? null,
            manager_id: dept.manager_id ?? null,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: {
        name: string;
        code: string;
        parent_id?: number | null;
        manager_id?: number | null;
    }) => {
        try {
            setSaving(true);
            const payload = {
                name: values.name.trim(),
                code: values.code.trim().toUpperCase(),
                parent_id: values.parent_id ?? null,
                manager_id: values.manager_id ?? null,
            };
            if (editing) {
                await updateDepartment(editing.id || editing.department_id!, payload);
                message.success('Đã cập nhật đơn vị');
            } else {
                await createDepartment(payload);
                message.success('Đã tạo đơn vị mới');
            }
            setModalOpen(false);
            await loadData();
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể lưu đơn vị'));
        } finally {
            setSaving(false);
        }
    };

    const filteredTree = useMemo(() => filterDepartmentTree(tree, searchText.trim()), [tree, searchText]);
    const excludedParentIds = useMemo(
        () => (editing ? collectDescendantIds(editing) : new Set<number>()),
        [editing]
    );

    const accessibleSet = useMemo(() => {
        if (!context?.accessible_department_ids) return null;
        return new Set(context.accessible_department_ids.map(Number));
    }, [context?.accessible_department_ids]);

    const columns: ColumnsType<CmsDepartment> = [
        {
            title: 'Đơn vị / Phân xưởng / Phòng ban',
            key: 'name',
            render: (_, record) => {
                const deptId = Number(record.id || record.department_id);
                const inManagerScope = accessibleSet ? accessibleSet.has(deptId) : true;
                return (
                    <div className="flex flex-wrap items-center gap-2">
                        <FolderTree size={15} className="shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
                        <span className="font-semibold text-[var(--text-primary)]">{record.name}</span>
                        {accessibleSet && inManagerScope && (
                            <Tag color="blue" className="m-0 text-[11px]">Thuộc phạm vi của bạn</Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Mã đơn vị',
            dataIndex: 'code',
            key: 'code',
            width: 140,
            render: (code: string) => <span className="font-mono-code text-xs font-semibold text-[var(--text-secondary)]">{code}</span>,
        },
        {
            title: 'Trưởng bộ phận',
            key: 'manager',
            render: (_, record) =>
                record.manager_name ? (
                    <span className="font-medium text-[var(--text-primary)]">{record.manager_name}</span>
                ) : (
                    <span className="text-xs text-[var(--text-muted)]">Chưa chỉ định</span>
                ),
        },
        {
            title: 'Nhân sự',
            dataIndex: 'member_count',
            key: 'member_count',
            align: 'right',
            width: 110,
            render: (cnt: number | string) => (
                <span className="inline-flex items-center gap-1 tabular-nums text-[13px] font-semibold text-[var(--text-secondary)]">
                    <Users size={13} className="text-[var(--text-muted)]" aria-hidden="true" />
                    {Number(cnt || 0)}
                </span>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            align: 'right',
            width: canManageDepartments ? 250 : 110,
            render: (_, record) => (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <Button size="small" icon={<Eye size={12} />} onClick={() => setInspectDept(record)}>
                        Chi tiết
                    </Button>
                    {canManageDepartments && (
                        <>
                            <Button size="small" icon={<Pencil size={12} />} onClick={() => openEdit(record)}>
                                Sửa
                            </Button>
                            <Button
                                size="small"
                                icon={<Plus size={12} />}
                                onClick={() => openCreate(record.id || record.department_id)}
                            >
                                Nhánh con
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const deptMembers = useMemo(() => {
        if (!inspectDept) return [];
        const targetId = Number(inspectDept.id || inspectDept.department_id);
        return members.filter((m) => Number(m.department_id) === targetId);
    }, [inspectDept, members]);

    return (
        <div>
            <PageHeader
                title="Cơ cấu Phòng ban & Phân xưởng"
                description="Tổ chức cây phân cấp đơn vị trong Workspace. Quyền Trưởng bộ phận (Manager) kế thừa theo đơn vị được giao và các nhánh con."
                meta={<StatusBadge value={currentRole} />}
                actions={
                    <>
                        <Button icon={<RefreshCw size={14} />} onClick={loadData} loading={loading}>
                            Làm mới
                        </Button>
                        {canManageDepartments && (
                            <Button type="primary" icon={<Plus size={14} />} onClick={() => openCreate(null)}>
                                Thêm đơn vị gốc
                            </Button>
                        )}
                    </>
                }
            />

            {!canManageDepartments && (
                <Alert
                    type="info"
                    showIcon
                    className="mb-4"
                    title="Quyền xem sơ đồ tổ chức"
                    description="Chỉ Quản trị viên (Admin) mới được thêm hoặc chỉnh sửa cây phòng ban và chỉ định Trưởng bộ phận."
                />
            )}

            <FilterBar
                left={
                    <Input.Search
                        allowClear
                        placeholder="Tìm theo tên, mã phòng ban hoặc trưởng bộ phận..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-72"
                    />
                }
                right={
                    <span className="text-xs text-[var(--text-muted)]">
                        Tổng {flatList.length} đơn vị trong Workspace
                    </span>
                }
            />

            {!currentWorkspaceId ? (
                <EmptyState title="Chưa chọn Workspace" description="Vui lòng chọn Workspace ở thanh tiêu đề." />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadData} />
            ) : loading ? (
                <LoadingState rows={5} />
            ) : filteredTree.length === 0 ? (
                <EmptyState
                    title="Chưa có phòng ban phù hợp"
                    description={searchText ? 'Thử xóa từ khóa tìm kiếm để xem toàn bộ cây tổ chức.' : 'Workspace này chưa khai báo phòng ban nào.'}
                />
            ) : (
                <div className="cms-panel p-4 sm:p-5">
                    <DataTable
                        rowKey={(r) => r.id || r.department_id!}
                        dataSource={filteredTree}
                        columns={columns}
                        pagination={false}
                        expandable={{ defaultExpandAllRows: true }}
                    />
                </div>
            )}

            <Modal
                title={editing ? `Cập nhật đơn vị: ${editing.name}` : 'Tạo phòng ban / Phân xưởng mới'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                okText={editing ? 'Lưu thay đổi' : 'Tạo mới'}
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-3">
                    <Form.Item
                        name="name"
                        label="Tên phòng ban / Phân xưởng"
                        rules={[{ required: true, message: 'Vui lòng nhập tên phòng ban' }]}
                    >
                        <Input placeholder="VD: Phân xưởng Ép Nhựa 1" />
                    </Form.Item>
                    <Form.Item
                        name="code"
                        label="Mã đơn vị"
                        rules={[{ required: true, message: 'Vui lòng nhập mã' }]}
                    >
                        <Input className="font-mono-code" placeholder="PX-EP-01" />
                    </Form.Item>
                    <Form.Item name="parent_id" label="Đơn vị cha">
                        <Select
                            allowClear
                            placeholder="Không có (Đơn vị cấp cao nhất)"
                            options={flatList
                                .filter((d) => !excludedParentIds.has(Number(d.id || d.department_id)))
                                .map((d) => ({
                                    label: `${d.code} — ${d.name}`,
                                    value: d.id || d.department_id,
                                }))}
                        />
                    </Form.Item>
                    <Form.Item name="manager_id" label="Trưởng bộ phận phụ trách (trong Workspace này)">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="Chọn thành viên quản lý đơn vị"
                            options={members.map((m) => ({
                                label: `${m.name} (${m.email}) — ${m.role_name}`,
                                value: m.user_id,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <SideDrawer
                title={inspectDept ? `${inspectDept.code} — ${inspectDept.name}` : 'Chi tiết đơn vị'}
                open={Boolean(inspectDept)}
                onClose={() => setInspectDept(null)}
            >
                {inspectDept && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-4 text-[13px]">
                            <div>
                                <div className="text-xs text-[var(--text-muted)]">Mã đơn vị</div>
                                <div className="mt-0.5 font-mono-code font-semibold text-[var(--text-primary)]">{inspectDept.code}</div>
                            </div>
                            <div>
                                <div className="text-xs text-[var(--text-muted)]">Trưởng bộ phận</div>
                                <div className="mt-0.5 font-semibold text-[var(--text-primary)]">
                                    {inspectDept.manager_name || 'Chưa chỉ định'}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-2.5 text-sm font-bold text-[var(--text-primary)]">
                                Nhân sự thuộc đơn vị ({deptMembers.length})
                            </h3>
                            {deptMembers.length === 0 ? (
                                <EmptyState embedded title="Chưa có nhân sự nào được gắn trực tiếp vào đơn vị này" />
                            ) : (
                                <DataTable
                                    rowKey="user_id"
                                    dataSource={deptMembers}
                                    pagination={false}
                                    columns={[
                                        {
                                            title: 'Họ tên & Email',
                                            key: 'name',
                                            render: (_, m) => (
                                                <div>
                                                    <div className="font-semibold text-[var(--text-primary)]">{m.name}</div>
                                                    <div className="text-xs text-[var(--text-muted)]">{m.email}</div>
                                                </div>
                                            ),
                                        },
                                        {
                                            title: 'Vai trò',
                                            dataIndex: 'role_name',
                                            key: 'role_name',
                                            render: (r: string) => <StatusBadge value={r} />,
                                        },
                                    ]}
                                />
                            )}
                        </div>
                    </div>
                )}
            </SideDrawer>
        </div>
    );
}
