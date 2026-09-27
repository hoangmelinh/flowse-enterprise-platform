import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, UserRound, X } from 'lucide-react';
import { Modal, Input } from 'antd';
import { sendInvitations } from '@/store/modules/workspaces';
import type { AppDispatch } from '@/store/configureStore';
import { useDispatch, useSelector } from 'react-redux';
import type { WorkspacesState } from '@/types/workspaces';
type InvitePeopleModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type InviteRole = 'ADMIN' | 'MANAGER' | 'MEMBER';

const roleOptions: Array<{
    id: InviteRole;
    label: string;
    description: string;
    badge?: string;
}> = [
        {
            id: 'MEMBER',
            label: 'Member',
            description: 'Can create and edit tasks, add comments, log time, and access all public items in your Workspace.',
        },
        {
            id: 'MANAGER',
            label: 'Manager',
            description: 'Can manage Spaces structure, Sprints, Milestones, Status, Lists and delete tasks.',
        },
        {
            id: 'ADMIN',
            label: 'Admin',
            description: 'Can manage Spaces, People, Billing and other Workspace settings.',
        },
    ];

export default function InvitePeopleModal({ open, onOpenChange }: InvitePeopleModalProps) {
    const [emails, setEmails] = useState('');
    const [role, setRole] = useState<InviteRole>('MEMBER');
    const [showRolePicker, setShowRolePicker] = useState(false);
    const dispatch = useDispatch<AppDispatch>();
    const roleValue = useMemo(
        () => roleOptions.find((r) => r.id === role) ?? roleOptions[0],
        [role],
    );
    const currentWorkspaceId = useSelector((state: { workspaces: WorkspacesState }) => state.workspaces.currentWorkspaceId);
    const handleSendInvite = async () => {

        if (!emails.trim()) {
            return;
        }
        await dispatch(sendInvitations({
            workspaceId: currentWorkspaceId?.toString() || '',
            emails: emails.trim(),
            role: role,
        }));
        onOpenChange(false);
    };

    return (
        <Modal
            open={open}
            onCancel={() => onOpenChange(false)}
            footer={null}
            closable={false}
            width={500}
            className="invite-people-modal"
            styles={{
                container: {
                    borderRadius: 16,
                    padding: 0,
                    backgroundColor: 'var(--color-surface-subtle)',
                },
                body: {
                    padding: 0,
                },
                header: {
                    display: 'none',
                },
            }}
        >
            <div className="relative px-5 pb-4 pt-5">
                <button
                    type="button"
                    className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-full border-0 bg-(--color-surface-hover) text-(--color-text-secondary) cursor-pointer transition-colors hover:bg-(--color-border)"
                    onClick={() => onOpenChange(false)}
                >
                    <X size={15} />
                </button>

                <h2 className="mb-3 text-[24px] font-black tracking-[-0.02em] text-(--color-on-surface)">
                    Invite people
                </h2>

                <div className="mb-3">
                    <div className="mb-1.5 text-[12px] font-bold text-(--color-text-secondary)">Invite by email</div>
                    <Input
                        value={emails}
                        onChange={(e) => setEmails(e.target.value)}
                        placeholder="Email, comma or space separated"
                        className="h-9 rounded-xl"
                    />
                </div>

                <div className="relative">
                    <div className="mb-1.5 text-[12px] font-bold text-(--color-text-secondary)">Invite as</div>
                    <button
                        type="button"
                        className="flex w-full items-center gap-2.5 rounded-xl border-0 bg-(--color-surface-hover) px-2.5 py-2 text-left cursor-pointer"
                        onClick={() => setShowRolePicker((v) => !v)}
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-border) text-(--color-text-secondary)">
                            <UserRound size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5 text-[13px] font-semibold text-(--color-on-surface)">
                                {roleValue.label}
                                {showRolePicker ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                            <div className="text-[11px] leading-[1.3] text-(--color-text-tertiary)">
                                {roleValue.description}
                            </div>
                        </div>
                    </button>

                    <div
                        className={`absolute left-0 top-[calc(100%+8px) z-20 w-85 origin-top rounded-2xl border border-(--color-border) bg-(--color-surface-subtle) p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12) transition-all duration-180 ease-out ${showRolePicker
                                ? 'translate-y-0 scale-100 opacity-100'
                                : 'pointer-events-none -translate-y-1 scale-[0.98] opacity-0'
                            }`}
                    >
                        <div className="max-h-60 overflow-y-auto pr-1">
                            {roleOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    className="mb-1 w-full rounded-xl border-0 bg-transparent px-2 py-1.5 text-left cursor-pointer hover:bg-(--color-surface-hover)"
                                    onClick={() => {
                                        setRole(opt.id);
                                        setShowRolePicker(false);
                                    }}
                                >
                                    <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-(--color-on-surface)">
                                        {opt.label}
                                        {opt.badge ? (
                                            <span className="rounded-xl bg-(--color-primary-fixed) px-2 py-0.5 text-[9px] font-semibold text-(--color-accent)">
                                                {opt.badge}
                                            </span>
                                        ) : null}
                                        {role === opt.id ? (
                                            <span className="ml-auto text-xs">✓</span>
                                        ) : null}
                                    </div>
                                    <p className="m-0 text-[10px] leading-[1.35] text-(--color-text-tertiary)">
                                        {opt.description}
                                    </p>
                                </button>
                            ))}
                        </div>  
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        className="border-0 bg-transparent text-[13px] font-semibold text-(--color-text-secondary) cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded-xl border-0 bg-(--color-inverse-surface) px-5 py-2 text-[13px] font-bold text-white cursor-pointer"
                        onClick={handleSendInvite}
                    >
                        Send invite
                    </button>
                </div>
            </div>
        </Modal>
    );
}
