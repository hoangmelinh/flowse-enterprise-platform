import React from 'react';
import { Building2, Factory, Layers } from 'lucide-react';

export type BusinessScope = 'all' | 'office' | 'industrial';

interface ScopeSwitchProps {
    value: BusinessScope;
    onChange: (scope: BusinessScope) => void;
    disabled?: boolean;
}

const SCOPE_OPTIONS: Array<{ value: BusinessScope; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: 'Toàn công ty', icon: <Layers size={15} aria-hidden="true" /> },
    { value: 'office', label: 'Công việc & Đề xuất', icon: <Building2 size={15} aria-hidden="true" /> },
    { value: 'industrial', label: 'Thiết bị & Sự cố', icon: <Factory size={15} aria-hidden="true" /> },
];

export const ScopeSwitch: React.FC<ScopeSwitchProps> = ({ value, onChange, disabled = false }) => (
    <div
        role="tablist"
        aria-label="Phạm vi nghiệp vụ điều hành"
        className="inline-flex flex-wrap items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-1"
    >
        {SCOPE_OPTIONS.map((opt) => {
            const active = value === opt.value;
            return (
                <button
                    key={opt.value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => onChange(opt.value)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        active
                            ? 'border-[var(--brand-primary-border)] bg-[var(--surface-primary)] text-[var(--brand-primary)] shadow-[var(--shadow-xs)]'
                            : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    {opt.icon}
                    <span>{opt.label}</span>
                </button>
            );
        })}
    </div>
);
