import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Alert,
    Button,
    Checkbox,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Tabs,
    Tag,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, Clock, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
    createSlaConfig,
    createWorkflowState,
    createWorkflowTransition,
    deleteWorkflowTransition,
    getSlaConfigs,
    getWorkflowDetail,
    getWorkflows,
    updateSlaConfig,
    type SlaConfig,
    type WorkflowDefinition,
    type WorkflowState,
    type WorkflowTransition,
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

export default function WorkflowsSlaPage() {
    const { currentWorkspaceId, currentRole, capabilities } = useCmsAuth();
    const canManageWorkflows = Boolean(capabilities.can_manage_workflows);

    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') === 'sla' ? 'sla' : 'fsm');
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
    const [selectedWfId, setSelectedWfId] = useState<number | null>(null);
    const [states, setStates] = useState<WorkflowState[]>([]);
    const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
    const [slaConfigs, setSlaConfigs] = useState<SlaConfig[]>([]);

    const [stateModalOpen, setStateModalOpen] = useState(false);
    const [transModalOpen, setTransModalOpen] = useState(false);
    const [slaModalOpen, setSlaModalOpen] = useState(false);
    const [editingSla, setEditingSla] = useState<SlaConfig | null>(null);
    const [saving, setSaving] = useState(false);

    const [stateForm] = Form.useForm();
    const [transForm] = Form.useForm();
    const [slaForm] = Form.useForm();

    const loadDetail = useCallback(async (wfId: number) => {
        const res = await getWorkflowDetail(wfId);
        if (res?.data) {
            setStates(res.data.states || []);
            setTransitions(res.data.transitions || []);
        }
    }, []);

    const loadAll = useCallback(async () => {
        if (!currentWorkspaceId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setErrorMsg(null);
            const [wfRes, slaRes] = await Promise.all([getWorkflows(), getSlaConfigs()]);
            const list = wfRes?.data || [];
            setWorkflows(list);
            setSlaConfigs(slaRes?.data || []);
            const targetId = selectedWfId || list[0]?.workflow_id || null;
            setSelectedWfId(targetId);
            if (targetId) {
                await loadDetail(targetId);
            }
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Không thể tải cấu hình Workflow & SLA');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentWorkspaceId, selectedWfId, loadDetail]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const stateNameById = (id: number) => {
        const s = states.find((st) => st.state_id === id);
        return s ? `${s.name} (${s.code})` : `#${id}`;
    };

    const selectedWorkflow = workflows.find((w) => w.workflow_id === selectedWfId);

    const handleAddState = async (values: Partial<WorkflowState>) => {
        if (!selectedWfId) return;
        try {
            setSaving(true);
            await createWorkflowState(selectedWfId, values);
            message.success('Đã thêm trạng thái mới');
            setStateModalOpen(false);
            stateForm.resetFields();
            await loadDetail(selectedWfId);
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể thêm trạng thái'));
        } finally {
            setSaving(false);
        }
    };

    const handleAddTransition = async (values: Partial<WorkflowTransition>) => {
        if (!selectedWfId) return;
        try {
            setSaving(true);
            await createWorkflowTransition(selectedWfId, values);
            message.success('Đã thêm bước chuyển trạng thái');
            setTransModalOpen(false);
            transForm.resetFields();
            await loadDetail(selectedWfId);
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể thêm transition'));
        } finally {
            setSaving(false);
        }
    };

    const requestDeleteTransition = (t: WorkflowTransition) => {
        if (!selectedWfId) return;
        confirmAction({
            title: `Xóa bước chuyển "${t.transition_name}"`,
            content: 'Xóa transition này sẽ khiến người dùng hiện trường không thể thực hiện thao tác chuyển trạng thái tương ứng.',
            okText: 'Xóa bước chuyển',
            danger: true,
            onConfirm: async () => {
                try {
                    await deleteWorkflowTransition(t.transition_id);
                    message.success('Đã xóa bước chuyển');
                    await loadDetail(selectedWfId);
                } catch (err: unknown) {
                    message.error(getApiErrorMessage(err, 'Không thể xóa bước chuyển'));
                }
            },
        });
    };

    const handleSaveSla = async (values: Partial<SlaConfig>) => {
        try {
            setSaving(true);
            if (editingSla) {
                await updateSlaConfig(editingSla.sla_config_id, values);
                message.success('Đã cập nhật cấu hình SLA');
            } else {
                await createSlaConfig(values);
                message.success('Đã thêm cấu hình SLA');
            }
            setSlaModalOpen(false);
            setEditingSla(null);
            const slaRes = await getSlaConfigs();
            setSlaConfigs(slaRes?.data || []);
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể lưu cấu hình SLA'));
        } finally {
            setSaving(false);
        }
    };

    const transitionColumns: ColumnsType<WorkflowTransition> = [
        {
            title: 'Hành động chuyển',
            dataIndex: 'transition_name',
            key: 'transition_name',
            render: (n: string) => <span className="font-semibold text-[var(--text-primary)]">{n}</span>,
        },
        {
            title: 'Luồng trạng thái',
            key: 'flow',
            render: (_, t) => (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Tag className="m-0">{stateNameById(t.from_state_id)}</Tag>
                    <ArrowRight size={13} className="text-[var(--text-muted)]" aria-hidden="true" />
                    <Tag color="blue" className="m-0">{stateNameById(t.to_state_id)}</Tag>
                </div>
            ),
        },
        {
            title: 'Vai trò được phép',
            dataIndex: 'allowed_roles',
            key: 'allowed_roles',
            render: (roles: string[]) => (
                <div className="flex flex-wrap gap-1">
                    {(roles || []).map((r) => (
                        <Tag key={r} color="geekblue" className="m-0">{r}</Tag>
                    ))}
                </div>
            ),
        },
        {
            title: 'Phê duyệt',
            dataIndex: 'requires_approval',
            key: 'requires_approval',
            width: 110,
            render: (req: boolean) =>
                req ? <Tag color="gold" className="m-0">Cần duyệt</Tag> : <span className="text-xs text-[var(--text-muted)]">Không</span>,
        },
        ...(canManageWorkflows
            ? [
                  {
                      title: 'Thao tác',
                      key: 'del',
                      align: 'right' as const,
                      width: 90,
                      render: (_: unknown, t: WorkflowTransition) => (
                          <Button
                              size="small"
                              danger
                              aria-label={`Xóa bước chuyển ${t.transition_name}`}
                              icon={<Trash2 size={12} />}
                              onClick={() => requestDeleteTransition(t)}
                          />
                      ),
                  },
              ]
            : []),
    ];

    const slaColumns: ColumnsType<SlaConfig> = [
        {
            title: 'Workflow',
            key: 'wf',
            render: (_, r) => (
                <span className="font-semibold text-[var(--text-primary)]">
                    {r.workflow_name || r.workflow_code || 'Mặc định'}
                </span>
            ),
        },
        {
            title: 'Mức độ',
            dataIndex: 'severity',
            key: 'severity',
            render: (s: string) => <StatusBadge value={s} />,
        },
        {
            title: 'Phản hồi mục tiêu',
            dataIndex: 'target_response_minutes',
            key: 'target_response_minutes',
            align: 'right',
            sorter: (a, b) => a.target_response_minutes - b.target_response_minutes,
            render: (m: number) => <span className="tabular-nums font-medium">{m} phút</span>,
        },
        {
            title: 'Xử lý xong mục tiêu',
            dataIndex: 'target_resolve_minutes',
            key: 'target_resolve_minutes',
            align: 'right',
            sorter: (a, b) => a.target_resolve_minutes - b.target_resolve_minutes,
            render: (m: number) => <span className="tabular-nums font-medium">{m} phút</span>,
        },
        {
            title: 'Ngưỡng cảnh báo',
            dataIndex: 'warning_threshold_percent',
            key: 'warning_threshold_percent',
            align: 'right',
            render: (p: number) => <span className="tabular-nums">{p}%</span>,
        },
        ...(canManageWorkflows
            ? [
                  {
                      title: 'Thao tác',
                      key: 'edit',
                      align: 'right' as const,
                      width: 110,
                      render: (_: unknown, r: SlaConfig) => (
                          <Button
                              size="small"
                              onClick={() => {
                                  setEditingSla(r);
                                  slaForm.setFieldsValue(r);
                                  setSlaModalOpen(true);
                              }}
                          >
                              Chỉnh sửa
                          </Button>
                      ),
                  },
              ]
            : []),
    ];

    return (
        <div>
            <PageHeader
                title="Quy trình (Workflow FSM) & Chính sách SLA"
                description="Tra cứu và quản trị luồng trạng thái đầu việc, vai trò chuyển trạng thái và định mức thời gian cam kết SLA."
                meta={
                    <div className="flex items-center gap-2">
                        <StatusBadge value={currentRole} />
                        {selectedWorkflow?.version !== undefined && (
                            <Tag className="m-0 font-mono-code">v{selectedWorkflow.version}</Tag>
                        )}
                    </div>
                }
                actions={
                    <Button icon={<RefreshCw size={14} />} onClick={loadAll} loading={loading}>
                        Làm mới
                    </Button>
                }
            />

            <Alert
                type={canManageWorkflows ? 'warning' : 'info'}
                showIcon
                className="mb-4"
                title={
                    canManageWorkflows
                        ? 'Cấu hình quy trình & SLA dùng chung toàn hệ thống'
                        : 'Chế độ chỉ đọc (Manager)'
                }
                description={
                    canManageWorkflows
                        ? 'Workflow và SLA áp dụng thống nhất theo mã quy trình trên hệ thống. Vui lòng cân nhắc kỹ trước khi thêm/xóa bước chuyển trạng thái.'
                        : 'Vai trò Manager được phép xem trạng thái quy trình và định mức SLA. Chỉ Quản trị viên (Admin) tại Workspace được phép chỉnh sửa.'
                }
            />

            {!currentWorkspaceId ? (
                <EmptyState title="Chưa chọn Workspace" description="Vui lòng chọn Workspace ở thanh tiêu đề." />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadAll} />
            ) : loading ? (
                <LoadingState rows={5} />
            ) : (
                <div className="cms-panel p-4 sm:p-5">
                    <Tabs
                        activeKey={activeTab}
                        onChange={(k) => {
                            setActiveTab(k);
                            const next = new URLSearchParams(searchParams);
                            if (k === 'fsm') next.delete('tab');
                            else next.set('tab', k);
                            setSearchParams(next, { replace: true });
                        }}
                        items={[
                            {
                                key: 'fsm',
                                label: 'Workflow State Machine',
                                children: (
                                    <div className="space-y-5">
                                        <FilterBar
                                            className="mb-2 border-none bg-[var(--surface-subtle)]"
                                            left={
                                                <Select
                                                    aria-label="Chọn quy trình Workflow"
                                                    value={selectedWfId ?? undefined}
                                                    onChange={(val) => {
                                                        setSelectedWfId(Number(val));
                                                        loadDetail(Number(val));
                                                    }}
                                                    className="w-72 sm:w-80"
                                                    options={workflows.map((wf) => ({
                                                        label: `${wf.code} — ${wf.name}`,
                                                        value: wf.workflow_id,
                                                    }))}
                                                />
                                            }
                                            right={
                                                canManageWorkflows && selectedWfId ? (
                                                    <>
                                                        <Button icon={<Plus size={14} />} onClick={() => setStateModalOpen(true)}>
                                                            Thêm State
                                                        </Button>
                                                        <Button type="primary" icon={<Plus size={14} />} onClick={() => setTransModalOpen(true)}>
                                                            Thêm Transition
                                                        </Button>
                                                    </>
                                                ) : null
                                            }
                                        />

                                        <div>
                                            <h3 className="mb-2 text-xs font-bold text-[var(--text-secondary)]">
                                                Danh sách trạng thái ({states.length})
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {states.map((st) => (
                                                    <Tag
                                                        key={st.state_id}
                                                        color={st.color || 'blue'}
                                                        className="m-0 px-3 py-1 text-xs font-semibold"
                                                    >
                                                        {st.name} ({st.code})
                                                        {st.is_initial ? ' · Đầu' : ''}
                                                        {st.is_terminal ? ' · Đóng' : ''}
                                                    </Tag>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="mb-2 text-xs font-bold text-[var(--text-secondary)]">
                                                Ma trận chuyển trạng thái ({transitions.length})
                                            </h3>
                                            {transitions.length === 0 ? (
                                                <EmptyState embedded title="Workflow này chưa có bước chuyển nào" />
                                            ) : (
                                                <DataTable
                                                    rowKey="transition_id"
                                                    dataSource={transitions}
                                                    columns={transitionColumns}
                                                    pagination={false}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                key: 'sla',
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Clock size={14} aria-hidden="true" /> Chính sách SLA ({slaConfigs.length})
                                    </span>
                                ),
                                children: (
                                    <div className="space-y-4">
                                        {canManageWorkflows && (
                                            <div className="flex justify-end">
                                                <Button
                                                    type="primary"
                                                    icon={<Plus size={14} />}
                                                    onClick={() => {
                                                        setEditingSla(null);
                                                        slaForm.resetFields();
                                                        slaForm.setFieldsValue({
                                                            workflow_id: selectedWfId,
                                                            severity: 'HIGH',
                                                            target_response_minutes: 30,
                                                            target_resolve_minutes: 240,
                                                            warning_threshold_percent: 80,
                                                        });
                                                        setSlaModalOpen(true);
                                                    }}
                                                >
                                                    Thêm cấu hình SLA
                                                </Button>
                                            </div>
                                        )}

                                        {slaConfigs.length === 0 ? (
                                            <EmptyState embedded title="Chưa có chính sách SLA nào được cấu hình" />
                                        ) : (
                                            <DataTable
                                                rowKey="sla_config_id"
                                                dataSource={slaConfigs}
                                                columns={slaColumns}
                                                pagination={false}
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
                title="Thêm State cho Workflow"
                open={stateModalOpen}
                onCancel={() => setStateModalOpen(false)}
                onOk={() => stateForm.submit()}
                confirmLoading={saving}
                okText="Lưu State"
                cancelText="Hủy"
            >
                <Form form={stateForm} layout="vertical" onFinish={handleAddState} className="mt-3">
                    <Form.Item name="code" label="Mã State" rules={[{ required: true, message: 'Bắt buộc nhập mã' }]}>
                        <Input className="font-mono-code" placeholder="ESCALATED" />
                    </Form.Item>
                    <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Bắt buộc nhập tên' }]}>
                        <Input placeholder="Đã chuyển cấp trên" />
                    </Form.Item>
                    <Form.Item name="color" label="Màu Tag">
                        <Input placeholder="orange" />
                    </Form.Item>
                    <Form.Item name="is_terminal" valuePropName="checked">
                        <Checkbox>Đây là trạng thái kết thúc (Terminal)</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Thêm Transition mới"
                open={transModalOpen}
                onCancel={() => setTransModalOpen(false)}
                onOk={() => transForm.submit()}
                confirmLoading={saving}
                okText="Lưu Transition"
                cancelText="Hủy"
            >
                <Form
                    form={transForm}
                    layout="vertical"
                    onFinish={handleAddTransition}
                    initialValues={{ allowed_roles: ['admin', 'manager'] }}
                    className="mt-3"
                >
                    <Form.Item name="transition_name" label="Tên hành động" rules={[{ required: true }]}>
                        <Input placeholder="Bắt đầu xử lý" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Form.Item name="from_state_id" label="Từ State" rules={[{ required: true }]}>
                            <Select options={states.map((s) => ({ label: s.name, value: s.state_id }))} />
                        </Form.Item>
                        <Form.Item name="to_state_id" label="Sang State" rules={[{ required: true }]}>
                            <Select options={states.map((s) => ({ label: s.name, value: s.state_id }))} />
                        </Form.Item>
                    </div>
                    <Form.Item name="allowed_roles" label="Vai trò được phép">
                        <Select
                            mode="multiple"
                            options={[
                                { label: 'admin', value: 'admin' },
                                { label: 'manager', value: 'manager' },
                                { label: 'member', value: 'member' },
                                { label: 'technician', value: 'technician' },
                                { label: 'reporter', value: 'reporter' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="requires_approval" valuePropName="checked">
                        <Checkbox>Yêu cầu phê duyệt trước khi chuyển</Checkbox>
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={editingSla ? 'Cập nhật cấu hình SLA' : 'Thêm cấu hình SLA'}
                open={slaModalOpen}
                onCancel={() => setSlaModalOpen(false)}
                onOk={() => slaForm.submit()}
                confirmLoading={saving}
                okText="Lưu SLA"
                cancelText="Hủy"
            >
                <Form form={slaForm} layout="vertical" onFinish={handleSaveSla} className="mt-3">
                    <Form.Item name="workflow_id" label="Workflow">
                        <Select options={workflows.map((w) => ({ label: w.name, value: w.workflow_id }))} />
                    </Form.Item>
                    <Form.Item name="severity" label="Mức độ" rules={[{ required: true }]}>
                        <Select
                            options={[
                                { label: 'CRITICAL', value: 'CRITICAL' },
                                { label: 'HIGH', value: 'HIGH' },
                                { label: 'MEDIUM', value: 'MEDIUM' },
                                { label: 'LOW', value: 'LOW' },
                            ]}
                        />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Form.Item name="target_response_minutes" label="Phản hồi (phút)">
                            <InputNumber min={1} className="w-full" />
                        </Form.Item>
                        <Form.Item name="target_resolve_minutes" label="Xử lý (phút)">
                            <InputNumber min={1} className="w-full" />
                        </Form.Item>
                        <Form.Item name="warning_threshold_percent" label="Cảnh báo (%)">
                            <InputNumber min={10} max={99} className="w-full" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
