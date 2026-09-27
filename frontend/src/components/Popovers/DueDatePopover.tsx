import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';

export interface DueDatePopoverProps {
    date: string | null;
    onSave: (dateStr: string | null) => void;
    onClose: () => void;
}

const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export default function DueDatePopover({ date, onSave, onClose }: DueDatePopoverProps) {
    const { t, i18n } = useTranslation('tasks');
    const [currentMonth, setCurrentMonth] = useState(date ? dayjs(date) : dayjs());
    const today = dayjs();
    const selectedDay = date ? dayjs(date) : null;

    const handleCalendarClick = (d: Dayjs) => { onSave(d.toISOString()); onClose(); };

    const startDow = currentMonth.startOf('month').day();
    const daysInMonth = currentMonth.daysInMonth();
    const calendarDays: (Dayjs | null)[] = [
        ...Array.from({ length: startDow }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => currentMonth.date(i + 1))
    ];

    const daysOfWeek = i18n.language === 'vi' ? DAYS_VI : DAYS_EN;

    return (
        <div className="flex w-65 flex-col overflow-hidden rounded-xl bg-[var(--color-surface-container-lowest)] p-3 shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-body-sm font-semibold text-[var(--color-on-surface)]">
                    {currentMonth.locale(i18n.language === 'vi' ? 'vi' : 'en').format('MMMM YYYY')}
                </span>
                <div className="flex items-center gap-1">
                    <button
                        className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
                        onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <button
                        className="flex h-6 w-6 items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors border-none bg-transparent cursor-pointer"
                        onClick={() => setCurrentMonth(m => m.add(1, 'month'))}
                    >
                        <ChevronRight size={13} />
                    </button>
                </div>
            </div>
            <div className="mb-1 grid grid-cols-7 gap-0">
                {daysOfWeek.map(d => (
                    <div key={d} className="py-1 text-center text-overline font-medium text-[var(--color-text-tertiary)]">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0">
                {calendarDays.map((d, i) => {
                    if (!d) return <div key={i} />;
                    const isToday = d.isSame(today, 'day');
                    const isSelected = selectedDay ? d.isSame(selectedDay, 'day') : false;
                    return (
                        <button
                            key={i}
                            onClick={() => handleCalendarClick(d)}
                            className={`flex h-8 w-full items-center justify-center rounded-full text-body-sm font-medium transition-colors border-none cursor-pointer
                                ${isSelected ? 'bg-[var(--color-accent)] text-white' : ''}
                                ${isToday && !isSelected ? 'border border-[var(--color-accent)] text-[var(--color-accent)] bg-transparent' : ''}
                                ${!isToday && !isSelected ? 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)] bg-transparent' : ''}
                            `}
                        >
                            {d.date()}
                        </button>
                    );
                })}
            </div>
            {date && (
                <button
                    className="mt-3 w-full rounded-md bg-[var(--color-error)]/10 py-1.5 text-caption font-semibold text-[var(--color-error)] hover:bg-[var(--color-error)]/20 transition-colors border-none cursor-pointer"
                    onClick={() => { onSave(null); onClose(); }}
                >
                    {t('detail.clearDate')}
                </button>
            )}
        </div>
    );
}