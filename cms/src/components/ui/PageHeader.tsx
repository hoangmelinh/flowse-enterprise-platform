import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    meta?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, meta }) => (
    <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="m-0 text-[22px] font-bold tracking-tight text-[var(--text-primary)]">{title}</h1>
                {meta}
            </div>
            {description && (
                <p className="mt-1.5 mb-0 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p>
            )}
        </div>
        {actions && <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
);
