import { useState, useRef, useEffect } from 'react';
import { X, Calendar, AlignLeft, Target, Zap } from 'lucide-react';

interface CreateSprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { name: string; description?: string; goal?: string; startDate?: string; endDate?: string }) => void;
    spaceName: string;
}

export default function CreateSprintModal({ isOpen, onClose, onCreate, spaceName }: CreateSprintModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [goal, setGoal] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const titleRef = useRef<HTMLInputElement>(null);

     
    useEffect(() => {
        if (isOpen) {
            setName('');
            setDescription('');
            setGoal('');
            setStartDate('');
            setEndDate('');
            setTimeout(() => titleRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name.trim()) return;
        onCreate({
            name: name.trim(),
            description: description.trim() || undefined,
            goal: goal.trim() || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-2000 flex items-center justify-center bg-[rgba(20,27,43,0.5)] backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="flex w-[480px] max-w-[95vw] flex-col rounded-xl bg-[var(--color-surface-container-lowest)] shadow-[0_16px_48px_rgba(0,0,0,0.2)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-border-light)] px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c5cfc] to-[#6c5ce7]">
                            <Zap size={14} className="text-white" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-[var(--color-on-surface)]">Tạo Sprint</span>
                            <span className="ml-2 text-xs text-[var(--color-text-tertiary)]">trong {spaceName}</span>
                        </div>
                    </div>
                    <button
                        className="flex cursor-pointer items-center rounded-md border-none bg-transparent p-1 text-[var(--color-text-tertiary)] hover:bg-[#f0f2f5] hover:text-[var(--color-text-secondary)]"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-col gap-4 px-5 py-4">
                    {/* Sprint Name */}
                    <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                            Tên Sprint *
                        </label>
                        <input
                            ref={titleRef}
                            className="w-full rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-3 py-2 text-[14px] font-medium text-[var(--color-on-surface)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-container-lowest)] focus:shadow-[0_0_0_3px_rgba(124,92,252,0.08)]"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Sprint 1"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && name.trim()) handleSubmit();
                            }}
                        />
                    </div>

                    {/* Goal */}
                    <div>
                        <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                            <Target size={11} /> Mục tiêu Sprint
                        </label>
                        <input
                            className="w-full rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-container-lowest)]"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            placeholder="Hoàn thành module đăng nhập..."
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                            <AlignLeft size={11} /> Mô tả
                        </label>
                        <textarea
                            className="min-h-[60px] w-full resize-y rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-3 py-2 text-[13px] text-[var(--color-text-secondary)] outline-none transition-all placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-container-lowest)]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Thêm mô tả..."
                            rows={2}
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                                <Calendar size={11} /> Ngày bắt đầu
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none transition-all focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-container-lowest)]"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                                <Calendar size={11} /> Ngày kết thúc
                            </label>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-3 py-2 text-[13px] text-[var(--color-on-surface)] outline-none transition-all focus:border-[var(--color-accent)] focus:bg-[var(--color-surface-container-lowest)]"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-light)] px-5 py-3.5">
                    <button
                        className="cursor-pointer rounded-lg border border-[var(--color-border-light)] bg-transparent px-4 py-2 text-[13px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-container-low)]"
                        onClick={onClose}
                    >
                        Hủy
                    </button>
                    <button
                        className="cursor-pointer rounded-lg border-none bg-gradient-to-r from-[#7c5cfc] to-[#6c5ce7] px-5 py-2 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(124,92,252,0.3)] transition-all hover:shadow-[0_4px_16px_rgba(124,92,252,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                    >
                        Tạo Sprint
                    </button>
                </div>
            </div>
        </div>
    );
}
