import { Flag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface PriorityPopoverProps {
    priority_name: string | null;
    onSave: (id: number | null, name: string | null, color: string | null) => void;
    onClose: () => void;
}

const PRIORITIES = [
    { id: 2, labelKey: 'priority.urgent', label: 'Urgent', color: '#f50000' },
    { id: 1, labelKey: 'priority.high',   label: 'High',   color: '#ffcc00' },
    { id: null, labelKey: 'priority.normal', label: 'Normal', color: '#4285f4' },
    { id: 3, labelKey: 'priority.low',    label: 'Low',    color: '#d1d5db' },
];

export default function PriorityPopover({ priority_name, onSave, onClose }: PriorityPopoverProps) {
    const { t } = useTranslation('tasks');

    const handleSelect = (id: number | null, label: string | null, color: string | null) => {
        onSave(id, label, color); onClose();
    };

    return (
        <div className="flex w-56 flex-col overflow-hidden rounded-xl bg-[var(--color-surface-container-lowest)] py-2 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <div className="mb-1 px-3 pt-1 text-overline font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide">
                {t('priority.label')}
            </div>
            <div className="flex flex-col">
                {PRIORITIES.map((p) => {
                    const isActive = priority_name === p.label;
                    return (
                        <button
                            key={p.label}
                            className={`flex items-center gap-2.5 px-3 py-1.75 text-left text-body-sm transition-colors border-none bg-transparent cursor-pointer hover:bg-[var(--color-surface-hover)] ${isActive ? 'bg-[var(--color-surface-hover)] font-semibold' : ''}`}
                            onClick={() => handleSelect(p.id, p.label, p.color)}
                        >
                            <Flag size={14} fill={p.label === 'Low' ? 'transparent' : p.color} color={p.color} />
                            <span className="text-[var(--color-on-surface)]">{t(p.labelKey, { defaultValue: p.label })}</span>
                        </button>
                    );
                })}
                <button
                    className="flex items-center gap-2.5 px-3 py-1.75 text-body-sm text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)] border-none bg-transparent cursor-pointer transition-colors"
                    onClick={() => handleSelect(null, null, null)}
                >
                    <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--color-border)]">
                        <X size={8} className="text-[var(--color-text-tertiary)]" />
                    </div>
                    {t('priority.clear')}
                </button>
            </div>
        </div>
    );
}