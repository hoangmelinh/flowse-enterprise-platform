import { useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Assignee } from '@/types/tasks';

export interface AssigneePopoverProps {
    allMembers: Assignee[] | null;
    assignees: Assignee[];
    onSave: (newAssignees: Assignee[]) => void;
    onClose: () => void;
}

export default function AssigneePopover({ allMembers = [], assignees = [], onSave }: AssigneePopoverProps) {
    const { t } = useTranslation('common');
    const [search, setSearch] = useState('');

    const toggleAssignee = (person: Assignee) => {
        const isExists = assignees.some(a => a.user_id === person.user_id);
        if (isExists) {
            onSave(assignees.filter(a => a.user_id !== person.user_id));
        } else {
            onSave([...assignees, person]);
        }
    };

    const filtered = (allMembers || []).filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase())
    );

    const getInitials = (name?: string | null) => {
        if (!name) return 'NA';
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="flex w-60 flex-col overflow-hidden rounded-xl bg-[var(--color-surface-container-lowest)] shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <div className="p-2 pb-1">
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--color-text-tertiary)]" />
                    <input
                        type="text"
                        placeholder={t('search.placeholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-2 pl-8 pr-2 text-caption text-[var(--color-on-surface)] outline-none focus:border-[var(--color-accent)] placeholder-[var(--color-text-tertiary)]"
                        autoFocus
                    />
                </div>
            </div>
            <div className="px-1 py-1 max-h-75 overflow-y-auto">
                <div className="px-2 pb-1 pt-0.5 text-overline font-semibold text-[var(--color-text-tertiary)] uppercase">
                    {t('members.workspaceMembers')}
                </div>
                {filtered.length > 0 ? (
                    filtered.map((p) => {
                        const isSelected = assignees.some(a => a.user_id === p.user_id);
                        return (
                            <button
                                key={p.user_id}
                                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${isSelected ? 'bg-[var(--color-primary-bg)]' : 'hover:bg-[var(--color-surface-hover)]'}`}
                                onClick={() => toggleAssignee(p)}
                            >
                                <Avatar size={24} src={p.avatar_url} style={{ backgroundColor: 'var(--color-accent)', fontSize: '10px', fontWeight: 700 }}>
                                    {!p.avatar_url && getInitials(p.name)}
                                </Avatar>
                                <span className={`flex-1 truncate text-body-sm ${isSelected ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-on-surface)]'}`}>
                                    {p.name}
                                </span>
                                {isSelected && <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />}
                            </button>
                        );
                    })
                ) : (
                    <div className="p-4 text-center text-caption text-[var(--color-text-tertiary)]">
                        {t('search.noResults', { defaultValue: 'No members found' })}
                    </div>
                )}
            </div>
        </div>
    );
}