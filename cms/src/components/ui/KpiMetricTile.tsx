import React from 'react';
import { Tooltip } from 'antd';
import { Info } from 'lucide-react';

export type MetricTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

interface KpiMetricTileProps {
    label: string;
    value: string | number | null | undefined;
    unit?: string;
    subtitle?: string;
    tone?: MetricTone;
    unavailableReason?: string;
    tooltip?: string;
}

const TONE_DOT: Record<MetricTone, string> = {
    neutral: 'bg-slate-400',
    brand: 'bg-[#0058BE]',
    success: 'bg-[#059669]',
    warning: 'bg-[#D97706]',
    danger: 'bg-[#DC2626]',
};

const TONE_VALUE: Record<MetricTone, string> = {
    neutral: 'text-[var(--text-primary)]',
    brand: 'text-[#0058BE]',
    success: 'text-[#059669]',
    warning: 'text-[#D97706]',
    danger: 'text-[#DC2626]',
};

export const KpiMetricTile: React.FC<KpiMetricTileProps> = ({
    label,
    value,
    unit,
    subtitle,
    tone = 'neutral',
    unavailableReason,
    tooltip,
}) => {
    const isUnavailable = value === null || value === undefined;

    return (
        <div className="cms-panel flex flex-col justify-between p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
                    <span className="text-[13px] font-semibold leading-snug text-[var(--text-secondary)]">{label}</span>
                </div>
                {tooltip && (
                    <Tooltip title={tooltip}>
                        <button
                            type="button"
                            aria-label={`Giải thích chỉ số ${label}`}
                            className="inline-flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <Info size={14} />
                        </button>
                    </Tooltip>
                )}
            </div>

            <div className={`mt-3 flex items-baseline ${unit === '%' ? 'gap-0.5' : 'gap-1'}`}>
                <span className={`tabular-nums text-[26px] font-bold leading-none tracking-tight ${isUnavailable ? 'text-[var(--text-muted)]' : TONE_VALUE[tone]}`}>
                    {isUnavailable ? 'N/A' : value}
                </span>
                {!isUnavailable && unit && (
                    <span className="text-[13px] font-medium text-[var(--text-muted)]">{unit}</span>
                )}
            </div>

            <div className="mt-2 text-[13px] leading-snug text-[var(--text-muted)]">
                {isUnavailable && unavailableReason ? unavailableReason : subtitle || '\u00A0'}
            </div>
        </div>
    );
};
