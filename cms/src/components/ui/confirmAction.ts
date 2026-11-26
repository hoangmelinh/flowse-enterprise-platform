import { Modal } from 'antd';

export function confirmAction(options: {
    title: string;
    content: string;
    okText?: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
}) {
    Modal.confirm({
        title: options.title,
        content: options.content,
        okText: options.okText || 'Xác nhận',
        cancelText: 'Hủy',
        okButtonProps: { danger: options.danger },
        onOk: options.onConfirm,
    });
}
