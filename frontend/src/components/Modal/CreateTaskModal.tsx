import { useState, useRef, useEffect } from 'react';
import {
    X, ChevronDown, Calendar, Flag, User, AlignLeft,
    Paperclip, FolderOpen, Hash, Milestone, ListTodo
} from 'lucide-react';
import type { NewTaskData, NewMilestoneData } from '@/types/tasks';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/configureStore';
import { fetchCreateMilestone } from '@/store/modules/milestones';
import { useTranslation } from 'react-i18next';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: NewTaskData) => void;

    groups: { id: number; name: string; color: string }[];

    lists: { id: number; name: string }[];
    defaultListId?: number;

}

const PRIORITY_OPTIONS = [
    { value: 'Urgent', label: 'Urgent', color: '#ef4444' },
    { value: 'High', label: 'High', color: '#f59e0b' },
    { value: 'Normal', label: 'Normal', color: '#3b82f6' },
    { value: 'Low', label: 'Low', color: '#8b5cf6' },
    { value: 'Clear', label: 'Clear', color: '#9ca3af' },
];

const MILESTONE_STATUS_OPTIONS = [
    { value: 'on_track' as const, label: 'On Track', color: '#00D4AA' },
    { value: 'at_risk' as const, label: 'At Risk', color: '#f59e0b' },
    { value: 'completed' as const, label: 'Completed', color: '#3b82f6' },
    { value: 'cancelled' as const, label: 'Cancelled', color: '#9ca3af' },
];

type ItemType = 'task' | 'milestone';

export default function CreateTaskModal({
    isOpen, onClose, onCreate,
    groups = [],
    lists = [],
    defaultListId,
}: CreateTaskModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation('tasks');
    const { t: tc } = useTranslation('common');

    const [itemType, setItemType] = useState<ItemType>('task');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    // Task fields
    const [statusId, setStatusId] = useState<number>(0);
    const [priority, setPriority] = useState<string>('Normal');
    const [dueDate, setDueDate] = useState<string | null>(null);
    const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
    const [listId, setListId] = useState<number | undefined>(defaultListId);

    // Milestone fields
    const [milestoneStatus, setMilestoneStatus] = useState<NewMilestoneData['status']>('on_track');
    const [milestoneColor, setMilestoneColor] = useState<string>('#00D4AA');
    const [milestoneDueDate, setMilestoneDueDate] = useState<string | null>(null);

    const [activeDropdown, setActiveDropdown] = useState<'status' | 'priority' | 'assignee' | 'list' | 'type' | 'milestoneStatus' | null>(null);

    const titleRef = useRef<HTMLInputElement>(null);
    const listMembers = useSelector((state: RootState) => state.workspaces.listWorkspaceMembers);
    const isCreatingMilestone = useSelector((state: RootState) => state.milestones.isCreatingMilestone);

     
    useEffect(() => {
        if (isOpen) {
            setItemType('task');
            setName('');
            setDescription('');
            setStatusId(groups.length > 0 ? groups[0].id : 0);
            setPriority('Normal');
            setDueDate(null);
            setAssigneeIds([]);
            setListId(defaultListId || (lists.length > 0 ? lists[0].id : undefined));
            setMilestoneStatus('on_track');
            setMilestoneColor('#00D4AA');
            setMilestoneDueDate(null);
            setTimeout(() => titleRef.current?.focus(), 100);
        }
    }, [isOpen, defaultListId, lists, groups]);

    if (!isOpen) return null;

    const currentStatus = groups.find(s => s.id === statusId) || groups[0] || { id: 0, name: 'No Status', color: '#ccc' };
    const currentPriority = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[2];
    const currentMilestoneStatus = MILESTONE_STATUS_OPTIONS.find(s => s.value === milestoneStatus) || MILESTONE_STATUS_OPTIONS[0];

    const handleCreate = async () => {
        if (!name.trim()) return;

        if (itemType === 'task') {
            if (!listId || !statusId) return;
            onCreate({
                name: name.trim(),
                description: description.trim() || null,
                list_id: listId,
                status_id: statusId,
                priority: priority,
                due_date: dueDate ? new Date(dueDate).toISOString() : null,
                assignee_ids: assigneeIds,
            });
            onClose();
        } else {
            // Milestone
            if (!listId) return;
            try {
                await dispatch(fetchCreateMilestone({
                    listId,
                    name: name.trim(),
                    description: description.trim() || undefined,
                    status: milestoneStatus,
                    color: milestoneColor,
                    dueDate: milestoneDueDate ? new Date(milestoneDueDate).toISOString() : undefined,
                })).unwrap();
                onClose();
            } catch {
                // error handled by Redux state
            }
        }
    };

    const toggleAssignee = (id: number) => {
        setAssigneeIds(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
    };

    const isMilestone = itemType === 'milestone';
    const namePlaceholder = isMilestone ? 'Milestone name...' : 'Task name...';
    const descPlaceholder = isMilestone ? 'Milestone description...' : 'Add description...';
    const submitLabel = isMilestone ? t('create.createMilestone') : t('create.createTask');
    const submitDisabled = isMilestone
        ? !name.trim() || !listId || isCreatingMilestone
        : !name.trim() || !listId || !statusId;

    return (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="flex w-145 max-w-[95vw] flex-col rounded-xl bg-[var(--color-surface-container-lowest)] shadow-2xl font-['Plus_Jakarta_Sans',sans-serif]" onClick={e => { e.stopPropagation(); setActiveDropdown(null); }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-surface-container-highest)] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
                            {isMilestone ? <Milestone size={14} /> : <Hash size={14} />}
                        </div>
                        <span className="text-body-sm font-bold text-[var(--color-on-surface)]">
                            {isMilestone ? t('create.createMilestoneNew') : t('create.title')}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-on-surface)] cursor-pointer bg-transparent border-0"><X size={20} /></button>
                </div>

                {/* Toolbar: list selector + type selector */}
                <div className="flex items-center gap-2 border-b border-[var(--color-surface-container-highest)] bg-[var(--color-surface-container-low)] px-5 py-2.5">
                    {/* List selector — only for task */}
                    {!isMilestone && (
                        <div className="relative" onClick={e => e.stopPropagation()}>
                            <button className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-caption font-semibold text-[var(--color-on-surface)] hover:border-[var(--color-primary)] cursor-pointer" onClick={() => setActiveDropdown(activeDropdown === 'list' ? null : 'list')}>
                                <FolderOpen size={13} className="text-[var(--color-primary)]" />
                                {lists.find(l => l.id === listId)?.name || 'Select List'}
                                <ChevronDown size={12} />
                            </button>
                            {activeDropdown === 'list' && (
                                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-1 shadow-xl">
                                    {lists.map(l => (
                                        <button key={l.id} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-caption font-medium hover:bg-[var(--color-primary-bg)] cursor-pointer border-0 bg-transparent text-[var(--color-on-surface)] ${listId === l.id ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : ''}`} onClick={() => { setListId(l.id); setActiveDropdown(null); }}>
                                            {l.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Type dropdown: Task / Milestone */}
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                            className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-caption font-semibold text-[var(--color-on-surface)] hover:border-[var(--color-primary)] cursor-pointer"
                            onClick={() => setActiveDropdown(activeDropdown === 'type' ? null : 'type')}
                        >
                            {isMilestone ? <Milestone size={13} className="text-[var(--color-tertiary)]" /> : <ListTodo size={13} className="text-[var(--color-primary)]" />}
                            {isMilestone ? 'Milestone' : 'Task'}
                            <ChevronDown size={12} />
                        </button>
                        {activeDropdown === 'type' && (
                            <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-1 shadow-xl">
                                <button
                                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-caption font-medium hover:bg-[var(--color-primary-bg)] cursor-pointer border-0 bg-transparent text-[var(--color-on-surface)] ${itemType === 'task' ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : ''}`}
                                    onClick={() => { setItemType('task'); setActiveDropdown(null); }}
                                >
                                    <ListTodo size={13} className="text-[var(--color-primary)]" /> Task
                                </button>
                                <button
                                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-caption font-medium hover:bg-[var(--color-primary-bg)] cursor-pointer border-0 bg-transparent text-[var(--color-on-surface)] ${itemType === 'milestone' ? 'bg-[var(--color-primary-bg)] text-[var(--color-tertiary)]' : ''}`}
                                    onClick={() => { setItemType('milestone'); setActiveDropdown(null); }}
                                >
                                    <Milestone size={13} className="text-[var(--color-tertiary)]" /> Milestone
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main input area */}
                <div className="px-6 py-4">
                    <input ref={titleRef} className="mb-2 w-full border-none bg-transparent text-h2 font-bold text-[var(--color-on-surface)] outline-none placeholder-[var(--color-text-tertiary)]" value={name} onChange={e => setName(e.target.value)} placeholder={namePlaceholder} />
                    <div className="flex items-start gap-2">
                        <AlignLeft size={16} className="mt-1 text-[var(--color-text-tertiary)]" />
                        <textarea className="w-full resize-none border-none bg-transparent text-body-sm leading-6 text-[var(--color-text-secondary)] outline-none placeholder-[var(--color-text-tertiary)]" value={description} onChange={e => setDescription(e.target.value)} placeholder={descPlaceholder} rows={3} />
                    </div>
                </div>

                {/* Action pills */}
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-surface-container-highest)] px-6 py-3">
                    {isMilestone ? (
                        <>
                            {/* Milestone status */}
                            <div className="relative" onClick={e => e.stopPropagation()}>
                                <button className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer" onClick={() => setActiveDropdown('milestoneStatus')}>
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentMilestoneStatus.color }} />
                                    {currentMilestoneStatus.label}
                                </button>
                                {activeDropdown === 'milestoneStatus' && (
                                    <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-1 shadow-xl">
                                        {MILESTONE_STATUS_OPTIONS.map(s => (
                                            <button key={s.value} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-caption font-medium border-0 bg-transparent text-[var(--color-on-surface)] hover:bg-[var(--color-primary-bg)] cursor-pointer" onClick={() => { setMilestoneStatus(s.value); setActiveDropdown(null); }}>
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Milestone color */}
                            <div className="relative flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer">
                                <div className="h-3 w-3 rounded-full border border-gray-200" style={{ backgroundColor: milestoneColor }} />
                                Color
                                <input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    value={milestoneColor}
                                    onChange={e => setMilestoneColor(e.target.value)}
                                />
                            </div>

                            {/* Milestone due date */}
                            <div className="relative flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer">
                                <Calendar size={14} />
                                <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setMilestoneDueDate(e.target.value)} />
                                {milestoneDueDate || 'Due date'}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Task status */}
                            <div className="relative" onClick={e => e.stopPropagation()}>
                                <button className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer" onClick={() => setActiveDropdown('status')}>
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                                    {currentStatus.name}
                                </button>
                                {activeDropdown === 'status' && (
                                    <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-1 shadow-xl">
                                        {groups.map(s => (
                                            <button key={s.id} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-caption font-medium border-0 bg-transparent text-[var(--color-on-surface)] hover:bg-[var(--color-primary-bg)] cursor-pointer" onClick={() => { setStatusId(s.id); setActiveDropdown(null); }}>
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Task assignee */}
                            <div className="relative" onClick={e => e.stopPropagation()}>
                                <button className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer" onClick={() => setActiveDropdown('assignee')}>
                                    <User size={14} /> {assigneeIds.length > 0 ? `${assigneeIds.length} members` : 'Assignee'}
                                </button>
                                {activeDropdown === 'assignee' && (
                                    <div className="absolute bottom-full left-0 mb-1 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-1 shadow-xl">
                                        {listMembers.map(m => (
                                            <button key={m.user_id} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-caption font-medium border-0 bg-transparent text-[var(--color-on-surface)] hover:bg-[var(--color-primary-bg)] cursor-pointer" onClick={() => toggleAssignee(m.user_id)}>
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full text-micro text-white" style={{ backgroundColor: 'black' }}>{m.user_id}</span>
                                                {m.username} {assigneeIds.includes(m.user_id) && <span className="ml-auto text-[var(--color-primary)]">✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Task priority */}
                            <div className="relative" onClick={e => e.stopPropagation()}>
                                <button className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold hover:bg-[var(--color-surface-hover)] cursor-pointer" style={{ color: currentPriority.color }} onClick={() => setActiveDropdown('priority')}>
                                    <Flag size={14} fill={priority !== 'Clear' ? currentPriority.color : 'none'} /> {currentPriority.label}
                                </button>
                                {activeDropdown === 'priority' && (
                                    <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] p-1 shadow-xl">
                                        {PRIORITY_OPTIONS.map(p => (
                                            <button key={p.value} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-caption font-medium border-0 bg-transparent text-[var(--color-on-surface)] hover:bg-[var(--color-primary-bg)] cursor-pointer" onClick={() => { setPriority(p.value); setActiveDropdown(null); }}>
                                                <Flag size={13} color={p.color} fill={p.value !== 'Clear' ? p.color : 'none'} /> {p.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Task due date */}
                            <div className="relative flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-caption font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer">
                                <Calendar size={14} />
                                <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setDueDate(e.target.value)} />
                                {dueDate || 'Due Date'}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[var(--color-surface-container-highest)] bg-[var(--color-surface-container-low)] px-6 py-4 rounded-b-xl">
                    <button className="flex items-center gap-1.5 text-caption font-bold text-[var(--color-text-tertiary)] hover:text-[var(--color-on-surface)] cursor-pointer bg-transparent border-0">
                        <Paperclip size={14} /> Attach File
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="rounded-md border border-[var(--color-border)] bg-transparent px-4 py-2 text-body-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] cursor-pointer">{tc('buttons.cancel')}</button>
                        <button
                            onClick={handleCreate}
                            disabled={submitDisabled}
                            className="rounded-md bg-[var(--color-primary)] px-6 py-2 text-body-sm font-bold text-[var(--color-on-primary)] shadow-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
                            style={isMilestone ? { background: 'var(--color-tertiary)' } : {}}
                        >
                            {isCreatingMilestone ? tc('buttons.saving') : submitLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
