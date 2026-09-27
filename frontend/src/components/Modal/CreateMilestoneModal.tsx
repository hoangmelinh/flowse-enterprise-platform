import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, Diamond, Palette, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/hooks';
import {
    fetchCreateMilestone,
    fetchUpdateMilestone,
    type MilestoneData,
} from '@/store/modules/milestones';

type MilestoneStatus = MilestoneData['status'];

interface CreateMilestoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    listId?: number;
    milestone?: MilestoneData | null;
    onSaved?: (milestone: MilestoneData) => void;
}

const STATUS_OPTIONS: Array<{ value: MilestoneStatus; label: string; color: string }> = [
    { value: 'on_track', label: 'On Track', color: '#00D4AA' },
    { value: 'at_risk', label: 'At Risk', color: '#f59e0b' },
    { value: 'completed', label: 'Completed', color: '#3b82f6' },
    { value: 'cancelled', label: 'Cancelled', color: '#9ca3af' },
];

function toDateInputValue(value?: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

export default function CreateMilestoneModal({
    isOpen,
    onClose,
    listId,
    milestone,
    onSaved,
}: CreateMilestoneModalProps) {
    const dispatch = useAppDispatch();
    const titleRef = useRef<HTMLInputElement>(null);
    const isEditing = Boolean(milestone);

    const isCreating = useAppSelector((state) => state.milestones.isCreatingMilestone);
    const isUpdating = useAppSelector((state) => state.milestones.isUpdatingMilestone);
    const errorCreating = useAppSelector((state) => state.milestones.errorCreatingMilestone);
    const errorUpdating = useAppSelector((state) => state.milestones.errorUpdatingMilestone);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<MilestoneStatus>('on_track');
    const [color, setColor] = useState('#00D4AA');
    const [dueDate, setDueDate] = useState('');
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setName(milestone?.name ?? '');
        setDescription(milestone?.description ?? '');
        setStatus(milestone?.status ?? 'on_track');
        setColor(milestone?.color ?? '#00D4AA');
        setDueDate(toDateInputValue(milestone?.due_date));
        setIsStatusOpen(false);
        setTimeout(() => titleRef.current?.focus(), 100);
    }, [isOpen, milestone]);

    const currentStatus = useMemo(
        () => STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0],
        [status],
    );

    if (!isOpen) return null;

    const isSaving = isCreating || isUpdating;
    const error = errorCreating || errorUpdating;

    const handleSubmit = async () => {
        if (!name.trim() || isSaving) return;

        const payload = {
            name: name.trim(),
            description: description.trim() || null,
            status,
            color,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        };

        try {
            const saved = isEditing && milestone
                ? await dispatch(fetchUpdateMilestone({
                    milestoneId: milestone.milestone_id,
                    ...payload,
                })).unwrap()
                : listId
                    ? await dispatch(fetchCreateMilestone({
                        listId,
                        ...payload,
                    })).unwrap()
                    : null;

            if (saved) {
                onSaved?.(saved);
                onClose();
            }
        } catch {
            // Error is exposed through Redux state.
        }
    };

    return (
        <div
            className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="flex w-145 max-w-[95vw] flex-col rounded-xl bg-[var(--color-surface-container-lowest)] shadow-2xl font-['Plus_Jakarta_Sans',sans-serif]"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsStatusOpen(false);
                }}
            >
                <div className="flex items-center justify-between border-b border-[var(--color-surface-container-highest)] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--color-primary-bg)] text-[var(--color-tertiary)]">
                            <Diamond size={14} fill="currentColor" />
                        </div>
                        <span className="text-body-sm font-bold text-[var(--color-on-surface)]">
                            {isEditing ? 'Edit Milestone' : 'Create Milestone'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer border-0 bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-on-surface)]"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-4">
                    <input
                        ref={titleRef}
                        className="mb-2 w-full border-none bg-transparent text-h2 font-bold text-[var(--color-on-surface)] outline-none placeholder-[var(--color-text-tertiary)]"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleSubmit();
                        }}
                        placeholder="Milestone name..."
                    />
                    <textarea
                        className="w-full resize-none border-none bg-transparent text-body-sm leading-6 text-[var(--color-text-secondary)] outline-none placeholder-[var(--color-text-tertiary)]"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Milestone description..."
                        rows={3}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-surface-container-highest)] px-6 py-3">
                    <div className="relative" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                            onClick={() => setIsStatusOpen((value) => !value)}
                        >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                            {currentStatus.label}
                            <ChevronDown size={12} />
                        </button>
                        {isStatusOpen && (
                            <div className="absolute bottom-full left-0 z-20 mb-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-1 shadow-xl">
                                {STATUS_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className="flex w-full cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-caption font-medium text-[var(--color-on-surface)] hover:bg-[var(--color-primary-bg)]"
                                        onClick={() => {
                                            setStatus(option.value);
                                            setIsStatusOpen(false);
                                        }}
                                    >
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: option.color }} />
                                        {option.label}
                                        {status === option.value && <Check size={12} className="ml-auto text-[var(--color-primary)]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <label className="relative flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
                        <Palette size={14} />
                        <span className="h-3 w-3 rotate-45 border border-gray-200" style={{ backgroundColor: color }} />
                        Color
                        <input
                            type="color"
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            value={color}
                            onChange={(event) => setColor(event.target.value)}
                        />
                    </label>

                    <label className="relative flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]">
                        <Calendar size={14} />
                        <input
                            type="date"
                            className="absolute inset-0 cursor-pointer opacity-0"
                            value={dueDate}
                            onChange={(event) => setDueDate(event.target.value)}
                        />
                        {dueDate || 'Due date'}
                    </label>
                </div>

                {error && (
                    <div className="px-6 pb-2 text-caption font-semibold text-[var(--color-error)]">
                        {error}
                    </div>
                )}

                <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-[var(--color-surface-container-highest)] bg-[var(--color-surface-container-low)] px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-md border border-[var(--color-border)] bg-transparent px-4 py-2 text-body-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={!name.trim() || (!listId && !isEditing) || isSaving}
                        className="cursor-pointer rounded-md border-0 bg-[var(--color-tertiary)] px-6 py-2 text-body-sm font-bold text-white shadow-lg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
