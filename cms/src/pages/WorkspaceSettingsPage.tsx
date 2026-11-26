import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, message } from 'antd';
import { AlertTriangle, RotateCcw, Save, Trash2 } from 'lucide-react';
import { deleteWorkspace, getWorkspaceById, updateWorkspace } from '@/api/cmsApi';
import { useCmsAuth } from '@/context/CmsAuthContext';
import { getApiErrorMessage } from '@/utils/error';
import {
    EmptyState,
    ErrorState,
    LoadingState,
    PageHeader,
    PermissionDeniedState,
    StatusBadge,
    confirmAction,
} from '@/components/ui';

export default function WorkspaceSettingsPage() {
    const { currentWorkspaceId, currentRole, capabilities, context, refreshContext, logout } = useCmsAuth();
    const canManageWorkspace = Boolean(capabilities.can_manage_workspace);

    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [initialValues, setInitialValues] = useState<{ name: string; slug: string; description: string }>({
        name: '',
        slug: '',
        description: '',
    });

    const [deleteConfirmName, setDeleteConfirmName] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const loadWorkspace = useCallback(async () => {
        if (!currentWorkspaceId) return;
        try {
            setLoading(true);
            setErrorMsg(null);
            const ws = await getWorkspaceById(currentWorkspaceId);
            const vals = {
                name: ws.name || '',
                slug: ws.slug || '',
                description: ws.description || '',
            };
            setInitialValues(vals);
            form.setFieldsValue(vals);
            setDirty(false);
        } catch (err: unknown) {
            const msg = getApiErrorMessage(err, 'Không thể tải thông tin Workspace');
            setErrorMsg(msg);
            message.error(msg);
        } finally {
            setLoading(false);
        }
    }, [currentWorkspaceId, form]);

    useEffect(() => {
        loadWorkspace();
    }, [loadWorkspace]);

    const applySave = async (values: { name: string; slug: string; description?: string }) => {
        if (!currentWorkspaceId) return;
        try {
            setSaving(true);
            await updateWorkspace(currentWorkspaceId, values);
            setInitialValues({ name: values.name, slug: values.slug, description: values.description || '' });
            setDirty(false);
            message.success('Đã cập nhật cấu hình Workspace');
            await refreshContext(currentWorkspaceId);
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể cập nhật Workspace'));
        } finally {
            setSaving(false);
        }
    };

    const handleSave = (values: { name: string; slug: string; description?: string }) => {
        if (values.slug.trim() !== initialValues.slug.trim()) {
            confirmAction({
                title: 'Xác nhận đổi Slug định danh Workspace',
                content: `Slug thay đổi từ "${initialValues.slug}" sang "${values.slug}". Tiếp tục lưu thay đổi này?`,
                okText: 'Lưu thay đổi',
                onConfirm: () => applySave(values),
            });
            return;
        }
        applySave(values);
    };

    const handleReset = () => {
        form.setFieldsValue(initialValues);
        setDirty(false);
    };

    const handleDelete = async () => {
        if (!currentWorkspaceId || !context?.user?.user_id) return;
        if (deleteConfirmName.trim() !== initialValues.name.trim()) {
            message.error('Tên Workspace xác nhận không khớp');
            return;
        }
        try {
            setDeleting(true);
            await deleteWorkspace(currentWorkspaceId, context.user.user_id);
            message.success('Đã xóa Workspace');
            setDeleteModalOpen(false);
            await logout();
        } catch (err: unknown) {
            message.error(getApiErrorMessage(err, 'Không thể xóa Workspace'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <PageHeader
                title="Cài đặt Workspace"
                description="Quản trị thông tin tổ chức và vòng đời Workspace đang chọn (yêu cầu quyền Admin tại Workspace này)."
                meta={<StatusBadge value={currentRole} />}
            />

            {!canManageWorkspace ? (
                <PermissionDeniedState
                    title="Chỉ Quản trị viên (Admin) mới được cấu hình Workspace"
                    description="Tài khoản của bạn hiện không giữ vai trò Admin tại Workspace này nên không thể sửa hoặc xóa Workspace."
                />
            ) : !currentWorkspaceId ? (
                <EmptyState title="Chưa chọn Workspace" description="Vui lòng chọn Workspace ở thanh tiêu đề." />
            ) : errorMsg ? (
                <ErrorState message={errorMsg} onRetry={loadWorkspace} />
            ) : loading ? (
                <LoadingState rows={4} />
            ) : (
                <div className="space-y-6">
                    {dirty && (
                        <Alert
                            type="warning"
                            showIcon
                            title="Có thay đổi chưa lưu"
                            description="Nhấn Lưu thay đổi để áp dụng cấu hình mới hoặc Hủy thay đổi để khôi phục dữ liệu ban đầu."
                        />
                    )}

                    <div className="cms-panel p-5 sm:p-6">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSave}
                            onValuesChange={() => setDirty(true)}
                            disabled={loading || saving}
                        >
                            <Form.Item
                                name="name"
                                label="Tên Workspace / Tổ chức"
                                rules={[{ required: true, message: 'Vui lòng nhập tên Workspace' }]}
                            >
                                <Input placeholder="VD: Nhà máy An Phát" />
                            </Form.Item>
                            <Form.Item
                                name="slug"
                                label="Slug định danh (URL)"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập slug' },
                                    { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Chỉ dùng chữ thường, số và dấu -' },
                                ]}
                            >
                                <Input className="font-mono-code" placeholder="nha-may-an-phat" />
                            </Form.Item>
                            <Form.Item name="description" label="Mô tả">
                                <Input.TextArea rows={3} placeholder="Mô tả phạm vi vận hành của Workspace..." />
                            </Form.Item>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={saving}
                                    disabled={!dirty}
                                    icon={<Save size={14} />}
                                >
                                    Lưu thay đổi
                                </Button>
                                <Button
                                    icon={<RotateCcw size={14} />}
                                    disabled={!dirty || saving}
                                    onClick={handleReset}
                                >
                                    Hủy thay đổi
                                </Button>
                            </div>
                        </Form>
                    </div>

                    <div className="cms-panel border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]/40 p-5 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="m-0 flex items-center gap-2 text-base font-bold text-[var(--status-danger)]">
                                    <AlertTriangle size={18} aria-hidden="true" />
                                    Vùng nguy hiểm — Xóa Workspace
                                </h2>
                                <p className="mt-1 mb-0 text-[13px] text-[var(--text-secondary)]">
                                    Xóa mềm Workspace sẽ gỡ quyền truy cập của toàn bộ thành viên và chỉ chủ sở hữu mới thực hiện được.
                                </p>
                            </div>
                            <Button
                                danger
                                icon={<Trash2 size={14} />}
                                onClick={() => {
                                    setDeleteConfirmName('');
                                    setDeleteModalOpen(true);
                                }}
                            >
                                Xóa Workspace
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <Modal
                title="Xác nhận xóa Workspace"
                open={deleteModalOpen}
                onCancel={() => setDeleteModalOpen(false)}
                onOk={handleDelete}
                okButtonProps={{ danger: true, loading: deleting, disabled: deleteConfirmName.trim() !== initialValues.name.trim() }}
                okText="Xác nhận xóa"
                cancelText="Hủy"
            >
                <Alert
                    type="warning"
                    showIcon
                    title={`Nhập chính xác "${initialValues.name}" để kích hoạt nút xác nhận xóa.`}
                    className="mb-3"
                />
                <Input
                    aria-label="Nhập tên Workspace để xác nhận xóa"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={initialValues.name}
                />
            </Modal>
        </div>
    );
}
