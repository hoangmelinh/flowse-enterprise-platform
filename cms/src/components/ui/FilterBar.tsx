import React from 'react';

interface FilterBarProps {
    left?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({ left, right, className = '' }) => (
    <div
        className={`no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3.5 py-2.5 ${className}`}
    >
        <div className="flex flex-wrap items-center gap-2.5">{left}</div>
        {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
);
