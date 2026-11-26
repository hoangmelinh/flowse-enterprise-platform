import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Form,
    Input,
    Modal,
    Select,
    Switch,
    Tabs,
    Tag,
    Tooltip,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { CheckCircle2, MailPlus, RefreshCw, ShieldCheck, UserMinus } from 'lucide-react';
import {
    getDepartments,
    getRolesMatrix,
    getWorkspaceInvitations,
    getWorkspaceMembers,
    inviteMemberToWorkspace,
    removeMemberFromWorkspace,
    updateWorkspaceMember,
    type CmsDepartment,
    type CmsInvitation,
    type CmsMember,
    type RolePermissionMatrix,
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
    confirmAction,
} from '@/components/ui';

export default function UsersRolesPage() {
    const { currentWorkspaceId, currentRole, capabilities, context } = useCmsAuth();
    const canManageMembers = Boolean(capabilities.can_manage_members);

    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [members, setMembers] = useState<CmsMember[]>([]);
    const [departments, setDepartments] = useState<CmsDepartment[]>([]);
    const [invitations, setInvitations] = useState<CmsInvitation[]>([]);
    const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);

    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('ALL');
    const [deptFilter, setDeptFilter] = useState<number | null>(null);
    const [permGroupFilter, setPermGroupFilter] = useState<string>('ALL');
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [inviteForm] = Form.useForm();

    const loadAll = useCallback(async () => {
        if (!currentWorkspaceId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setErrorMsg(null);
            const [membersRes, deptsRes, matrixRes, invRes] = await Promise.all([
                getWorkspaceMembers(currentWorkspaceId),
                getDepartments(currentWorkspaceId),
                getRolesMatrix(),
                capabilities.can_manage_members
                    ? getWorkspaceInvitations(currentWorkspaceId).catch(() => ({ success: false, data: [] }))
                    : Promise.resolve({ success: true, data: [] }),
            ]);
            setMembers(Array.isArray(membersRes) ? membersRes : []);
            setDepartments(deptsRes?.data || []);
            setMatrix(matrixRes?.data || null);
            setInvitations(invRes?.data || []);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Không thể tải danh sách nhân sự & phân quyền');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentWorkspaceId, capabilities.can_manage_members]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const applyMemberUpdate = async (
        userId: number,
        payload: { role_name?: string; department_id?: number | null; is_active?: boolean },
        successMsg = 'Đã cập nhật phân quyền thành viên'
    ) => {
        if (!currentWorkspaceId) return;
        try {
            setUpdatingUserId(userId);
            await updateWorkspaceMember(currentWorkspaceId, userId, payload);
            message.success(successMsg);
            await loadAll();
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể cập nhật thành viên'));
        } finally {
            setUpdatingUserId(null);
        }
    };

    const requestRoleChange = (record: CmsMember, nextRole: string) => {
        confirmAction({
            title: `Thay đổi vai trò của ${record.name}`,
            content: `Xác nhận đổi vai trò Workspace từ "${record.role_name}" sang "${nextRole}"? Thay đổi này ảnh hưởng ngay đến quyền truy cập của nhân sự trong Workspace hiện tại.`,
            okText: 'Cập nhật vai trò',
            danger: nextRole === 'admin' || record.role_name?.toLowerCase() === 'admin',
            onConfirm: () => applyMemberUpdate(record.user_id, { role_name: nextRole }),
        });
    };

    const requestActiveToggle = (record: CmsMember, checked: boolean) => {
        confirmAction({
            title: checked ? `Mở khóa tài khoản ${record.name}` : `Khóa tài khoản ${record.name}`,
            content: checked
                ? 'Khôi phục quyền đăng nhập hệ thống cho tài khoản này?'
                : 'Khóa tài khoản sẽ chặn đăng nhập toàn hệ thống (nếu nhân sự tham gia nhiều Workspace, hãy dùng Gỡ khỏi Workspace thay thế).',
            okText: checked ? 'Mở khóa' : 'Khóa tài khoản',
            danger: !checked,
            onConfirm: () => applyMemberUpdate(record.user_id, { is_active: checked }),
        });
    };

    const requestRemoveMember = (record: CmsMember) => {
        if (!currentWorkspaceId) return;
        confirmAction({
            title: `Gỡ ${record.name} khỏi Workspace`,
            content: 'Nhân sự sẽ mất quyền truy cập Workspace này nhưng tài khoản cá nhân và tư cách ở các Workspace khác vẫn được giữ nguyên.',
            okText: 'Gỡ khỏi Workspace',
            danger: true,
            onConfirm: async () => {
                try {
                    setUpdatingUserId(record.user_id);
                    await removeMemberFromWorkspace(currentWorkspaceId, record.user_id);
                    message.success(`Đã gỡ ${record.name} khỏi Workspace`);
                    await loadAll();
                } catch (err: unknown) {
                    message.error(getApiErrorMessage(err, 'Không thể gỡ thành viên khỏi Workspace'));
                } finally {
                    setUpdatingUserId(null);
                }
            },
        });
    };

    const handleInvite = async (values: { email: string; role: string }) => {
        if (!currentWorkspaceId) return;
        try {
            setInviting(true);
            await inviteMemberToWorkspace(currentWorkspaceId, values.email.trim(), values.role);
            message.success(`Đã gửi lời mời đến ${values.email}`);
            setInviteOpen(false);
            inviteForm.resetFields();
            await loadAll();
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể gửi lời mời'));
        } finally {
            setInviting(false);
        }
    };

    const filteredMembers = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        return members.filter((m) => {
            if (roleFilter !== 'ALL' && m.role_name?.toLowerCase() !== roleFilter) return false;
            if (deptFilter !== null && m.department_id !== deptFilter) return false;
            if (!q) return true;
            return (
                (m.name || '').toLowerCase().includes(q) ||
                (m.email || '').toLowerCase().includes(q) ||
                (m.employee_code || '').toLowerCase().includes(q) ||
                (m.department_name || '').toLowerCase().includes(q)
            );
        });
    }, [members, roleFilter, deptFilter, searchText]);

    const memberColumns: ColumnsType<CmsMember> = [
        {
            title: 'Thành viên',
            key: 'user',
            sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'vi'),
            render: (_, record) => (
                <div>
                    <div className="font-semibold text-[var(--text-primary)]">
                        {record.name}
                        {record.employee_code && (
                            <span className="ml-2 rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono-code text-[11px] text-[var(--text-secondary)]">
                                {record.employee_code}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{record.email}</div>
                </div>
            ),
        },
        {
            title: 'Vai trò Workspace',
            key: 'role',
            width: 175,
            sorter: (a, b) => (a.role_name || '').localeCompare(b.role_name || ''),
            render: (_, record) => {
                const isSelf = Number(record.user_id) === Number(context?.user?.user_id);
                if (!canManageMembers) {
                    return <StatusBadge value={record.role_name} />;
                }
                return (
                    <Select
                        size="small"
                        aria-label={`Vai trò của ${record.name}`}
                        className="w-36"
                        value={record.role_name?.toLowerCase()}
                        disabled={isSelf || updatingUserId === record.user_id}
                        onChange={(val) => requestRoleChange(record, val)}
                        options={[
                            { label: 'Admin', value: 'admin' },
                            { label: 'Manager', value: 'manager' },
                            { label: 'Member', value: 'member' },
                        ]}
                    />
                );
            },
        },
        {
            title: 'Đơn vị / Phòng ban',
            key: 'department',
            width: 240,
            render: (_, record) => {
                if (!canManageMembers) {
                    return (
                        <span className="text-[13px] text-[var(--text-secondary)]">
                            {record.department_name || 'Chưa phân đơn vị'}
                        </span>
                    );
                }
                return (
                    <Select
                        size="small"
                        allowClear
                        aria-label={`Phòng ban của ${record.name}`}
                        className="w-52"
                        placeholder="Chưa phân đơn vị"
                        value={record.department_id ?? undefined}
                        disabled={updatingUserId === record.user_id}
                        onChange={(val) => applyMemberUpdate(record.user_id, { department_id: val ?? null })}
                        options={departments.map((d) => ({
                            label: `${d.code} — ${d.name}`,
                            value: d.id || d.department_id,
                        }))}
                    />
                );
            },
        },
        {
            title: 'Trạng thái',
            key: 'active',
            width: 165,
            render: (_, record) => {
                const active = record.is_active !== false;
                const isSelf = Number(record.user_id) === Number(context?.user?.user_id);
                if (!canManageMembers) {
                    return <StatusBadge value={active ? 'ACTIVE' : 'INACTIVE'} />;
                }
                return (
                    <div className="flex items-center gap-2">
                        <Switch
                            size="small"
                            aria-label={`Trạng thái tài khoản ${record.name}`}
                            checked={active}
                            disabled={isSelf || updatingUserId === record.user_id}
                            onChange={(checked) => requestActiveToggle(record, checked)}
                        />
                        <StatusBadge value={active ? 'ACTIVE' : 'INACTIVE'} />
                    </div>
                );
            },
        },
        ...(canManageMembers
            ? [
                  {
                      title: 'Thao tác',
                      key: 'actions',
                      width: 110,
                      align: 'right' as const,
                      render: (_: unknown, record: CmsMember) => {
                          const isSelf = Number(record.user_id) === Number(context?.user?.user_id);
                          return (
                              <Tooltip title={isSelf ? 'Không thể tự gỡ chính mình' : 'Gỡ khỏi Workspace này'}>
                                  <Button
                                      size="small"
                                      danger
                                      type="text"
                                      icon={<UserMinus size={14} />}
                                      disabled={isSelf || updatingUserId === record.user_id}
                                      onClick={() => requestRemoveMember(record)}
                                  >
                                      Gỡ
                                  </Button>
                              </Tooltip>
                          );
                      },
                  },
              ]
            : []),
    ];

    const permGroups = useMemo(() => {
        const set = new Set<string>();
        (matrix?.permissions || []).forEach((p) => {
            if (p.group_name) set.add(p.group_name);
        });
        return Array.from(set);
    }, [matrix]);

    const filteredPermissions = useMemo(
        () =>
            (matrix?.permissions || []).filter(
                (p) => permGroupFilter === 'ALL' || p.group_name === permGroupFilter
            ),
        [matrix, permGroupFilter]
    );

    const hasPerm = (roleId: number, permId: number) =>
        Boolean(matrix?.mappings.some((m) => m.role_id === roleId && m.permission_id === permId));

    return (
        <div>
            <PageHeader
                title="Nhân sự & Phân quyền Workspace"
                description="Phân biệt vai trò Workspace (Admin / Manager / Member), đơn vị công tác (Department Scope) và bảng ma trận 21 quyền chi tiết."
                meta={<StatusBadge value={currentRole} />}
                actions={
                    <>
                        <Button icon={<RefreshCw size={14} />} onClick={loadAll} loading={loading}>
                            Làm mới
                        </Button>
                        {canManageMembers && (
                            <Button type="primary" icon={<MailPlus size={14} />} onClick={() => setInviteOpen(true)}>
                                Mời nhân sự
                            </Button>
                        )}
                    </>
                }
            />

            {!canManageMembers && (
                <Alert
                    type="info"
                    showIcon
                    className="mb-4"
                    title="Chế độ chỉ đọc (Manager)"
                    description="Chỉ Quản trị viên (Admin) của Workspace mới có quyền mời nhân sự, đổi vai trò, phân công phòng ban hoặc gỡ thành viên."
                />
            )}

            {!currentWorkspaceId ? (
                <EmptyState title="Chưa chọn Workspace" description="Vui lòng chọn Workspace ở thanh tiêu đề." />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadAll} />
            ) : (
                <div className="cms-panel p-4 sm:p-5">
                    <Tabs
                        items={[
                            {
                                key: 'members',
                                label: `Danh sách Nhân sự (${members.length})`,
                                children: (
                                    <div className="space-y-4">
                                        <FilterBar
                                            className="mb-2 border-none bg-[var(--surface-subtle)]"
                                            left={
                                                <>
                                                    <Input.Search
                                                        allowClear
                                                        placeholder="Tìm theo họ tên, email, mã NV..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        className="w-64 sm:w-72"
                                                    />
                                                    <Select
                                                        aria-label="Lọc theo vai trò"
                                                        value={roleFilter}
                                                        onChange={setRoleFilter}
                                                        className="w-40"
                                                        options={[
                                                            { label: 'Mọi vai trò', value: 'ALL' },
                                                            { label: 'Admin', value: 'admin' },
                                                            { label: 'Manager', value: 'manager' },
                                                            { label: 'Member', value: 'member' },
                                                        ]}
                                                    />
                                                    <Select
                                                        allowClear
                                                        aria-label="Lọc theo phòng ban"
                                                        placeholder="Tất cả phòng ban"
                                                        value={deptFilter ?? undefined}
                                                        onChange={(val) => setDeptFilter(val ? Number(val) : null)}
                                                        className="w-48"
                                                        options={departments.map((d) => ({
                                                            label: `${d.code} — ${d.name}`,
                                                            value: d.id || d.department_id,
                                                        }))}
                                                    />
                                                </>
                                            }
                                            right={
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    Hiển thị {filteredMembers.length}/{members.length} thành viên
                                                </span>
                                            }
                                        />

                                        {loading ? (
                                            <LoadingState rows={5} />
                                        ) : filteredMembers.length === 0 ? (
                                            <EmptyState embedded title="Không có thành viên phù hợp bộ lọc" />
                                        ) : (
                                            <DataTable
                                                rowKey="user_id"
                                                dataSource={filteredMembers}
                                                columns={memberColumns}
                                                pagination={{ pageSize: 12 }}
                                            />
                                        )}
                                    </div>
                                ),
                            },
                            ...(canManageMembers
                                ? [
                                      {
                                          key: 'invitations',
                                          label: `Lời mời tham gia (${invitations.length})`,
                                          children: loading ? (
                                              <LoadingState rows={3} />
                                          ) : invitations.length === 0 ? (
                                              <EmptyState embedded title="Chưa có lời mời nào được gửi trong Workspace này" />
                                          ) : (
                                              <DataTable
                                                  rowKey="invitation_id"
                                                  dataSource={invitations}
                                                  columns={[
                                                      { title: 'Email được mời', dataIndex: 'email', key: 'email' },
                                                      {
                                                          title: 'Trạng thái',
                                                          dataIndex: 'status',
                                                          key: 'status',
                                                          render: (st: string) => <StatusBadge value={st} />,
                                                      },
                                                      {
                                                          title: 'Người mời',
                                                          dataIndex: 'invited_by_name',
                                                          key: 'invited_by_name',
                                                          render: (v?: string) => v || 'Quản trị viên',
                                                      },
                                                      {
                                                          title: 'Thời gian gửi',
                                                          dataIndex: 'created_at',
                                                          key: 'created_at',
                                                          render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
                                                      },
                                                  ]}
                                                  pagination={{ pageSize: 10 }}
                                              />
                                          ),
                                      },
                                  ]
                                : []),
                            {
                                key: 'matrix',
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        <ShieldCheck size={14} aria-hidden="true" /> Ma trận Phân quyền RBAC
                                    </span>
                                ),
                                children: !matrix ? (
                                    <LoadingState rows={6} />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-[13px] text-[var(--text-secondary)]">
                                                Quyền thực tế được kết hợp giữa vai trò Workspace bên dưới và phạm vi phòng ban/đối tượng ở máy chủ.
                                            </span>
                                            <Select
                                                aria-label="Lọc nhóm quyền"
                                                value={permGroupFilter}
                                                onChange={setPermGroupFilter}
                                                className="w-44"
                                                options={[
                                                    { label: 'Mọi nhóm quyền', value: 'ALL' },
                                                    ...permGroups.map((g) => ({ label: g.toUpperCase(), value: g })),
                                                ]}
                                            />
                                        </div>
                                        <DataTable
                                            rowKey="permission_id"
                                            dataSource={filteredPermissions}
                                            pagination={false}
                                            columns={[
                                                {
                                                    title: 'Nhóm quyền',
                                                    dataIndex: 'group_name',
                                                    key: 'group_name',
                                                    width: 130,
                                                    render: (g: string) => <Tag>{(g || 'CORE').toUpperCase()}</Tag>,
                                                },
                                                {
                                                    title: 'Mã quyền',
                                                    dataIndex: 'permission_name',
                                                    key: 'permission_name',
                                                    render: (name: string) => (
                                                        <span className="font-mono-code text-xs font-semibold text-[var(--text-primary)]">
                                                            {name}
                                                        </span>
                                                    ),
                                                },
                                                {
                                                    title: 'Mô tả nghiệp vụ',
                                                    dataIndex: 'description',
                                                    key: 'description',
                                                },
                                                ...matrix.roles.map((role) => ({
                                                    title: role.role_name.toUpperCase(),
                                                    key: `role_${role.role_id}`,
                                                    align: 'center' as const,
                                                    width: 100,
                                                    render: (_: unknown, perm: RolePermissionMatrix['permissions'][number]) =>
                                                        hasPerm(role.role_id, perm.permission_id) ? (
                                                            <CheckCircle2 size={16} className="mx-auto text-[var(--status-success)]" aria-label="Có quyền" />
                                                        ) : (
                                                            <span className="text-slate-300" aria-label="Không">—</span>
                                                        ),
                                                })),
                                            ]}
                                        />
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            <Modal
                title="Mời nhân sự mới vào Workspace"
                open={inviteOpen}
                onCancel={() => setInviteOpen(false)}
                onOk={() => inviteForm.submit()}
                confirmLoading={inviting}
                okText="Gửi lời mời"
                cancelText="Hủy"
            >
                <Form
                    form={inviteForm}
                    layout="vertical"
                    initialValues={{ role: 'member' }}
                    onFinish={handleInvite}
                    className="mt-3"
                >
                    <Form.Item
                        name="email"
                        label="Email nhân sự"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' },
                        ]}
                    >
                        <Input placeholder="nguyen.van.a@anphat.vn" />
                    </Form.Item>
                    <Form.Item name="role" label="Vai trò khởi tạo trong Workspace" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { label: 'Member — Nhân sự vận hành / Kỹ thuật / Văn phòng', value: 'member' },
                                { label: 'Manager — Trưởng bộ phận / Giám sát theo phạm vi', value: 'manager' },
                                { label: 'Admin — Toàn quyền quản trị trong Workspace này', value: 'admin' },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
