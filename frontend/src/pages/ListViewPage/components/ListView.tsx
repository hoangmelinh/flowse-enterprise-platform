import { useState } from 'react';
import { useEffect } from 'react';
import { ChevronDown, ChevronRight, Calendar, Flag, User, Plus } from 'lucide-react';
import { Avatar } from 'antd';
import { useTaskView } from '../ListViewPage';
import TaskDetailModal from '@/components/TaskDetailModal/TaskDetailModal';
import CreateMilestoneModal from '@/components/Modal/CreateMilestoneModal';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchMilestonesByList, type MilestoneData } from '@/store/modules/milestones';

const getInitials = (name?: string | null) => name ? name.substring(0, 2).toUpperCase() : 'NA';
const formatDate = (dateString: string | null) =>
    dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

const MILESTONE_STATUS_LABELS: Record<MilestoneData['status'], string> = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const STATUS_COLORS = [
    '#6b7280', '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4',
];

export default function ListView() {
    const { groups, setGroups, columns, updateTask, handleCreateStatus, onContextMenu, listId } = useTaskView();
    const dispatch = useAppDispatch();
    const milestones = useAppSelector((state) => state.milestones.listMilestones);
    const loadingMilestones = useAppSelector((state) => state.milestones.isLoadingMilestones);

    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [editingMilestone, setEditingMilestone] = useState<MilestoneData | null>(null);

    const selectedTask = selectedTaskId != null
        ? groups.flatMap(g => g.tasks).find(t => t.task_id === selectedTaskId) ?? null
        : null;

    const toggleGroup = (groupId: number) =>
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g));

    useEffect(() => {
        if (!listId) return;
        void dispatch(fetchMilestonesByList(listId));
    }, [dispatch, listId]);

    // Add Status state
    const [showAddStatus, setShowAddStatus] = useState(false);
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState(STATUS_COLORS[0]);

    return (
        <div className="flex flex-1 flex-col overflow-hidden bg-[var(--color-surface-container-lowest)] font-sans">
            <div className="flex-1 overflow-y-auto p-6">
                {(loadingMilestones || milestones.length > 0) && (
                    <div className="mb-8">
                        <div className="group mb-2 flex items-center gap-2 py-1">
                            <div className="flex h-5 w-5 items-center justify-center" />
                            <div className="flex items-center gap-1.5 rounded-md bg-[var(--color-surface-hover)] px-2 py-1">
                                <div className="h-3.5 w-3.5 rotate-45 border-[1.5px] border-solid border-[var(--color-tertiary)] bg-transparent" />
                                <span className="text-[12px] font-semibold text-[var(--color-on-surface)]">Milestones</span>
                            </div>
                            <span className="ml-1 text-[12px] text-[var(--color-text-tertiary)]">{milestones.length}</span>
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center border-b border-[var(--color-border-light)] py-2 pl-8 pr-4">
                                <div className="flex-1 pr-4"><span className="text-[12px] font-semibold text-[#7c828d]">Name</span></div>
                                {columns.dueDate && <div className="w-32.5 shrink-0 pl-2"><span className="text-[12px] font-semibold text-[#7c828d]">Due date</span></div>}
                                <div className="w-30 shrink-0 pl-2"><span className="text-[12px] font-semibold text-[#7c828d]">Status</span></div>
                                <div className="w-27.5 shrink-0 pl-2"><span className="text-[12px] font-semibold text-[#7c828d]">Progress</span></div>
                                <div className="w-8 shrink-0" />
                            </div>

                            {loadingMilestones ? (
                                <div className="border-b border-[var(--color-surface-hover)] py-3 pl-8 pr-4 text-[13px] font-medium text-[var(--color-text-tertiary)]">
                                    Loading milestones...
                                </div>
                            ) : milestones.map((milestone) => {
                                const totalTasks = Number(milestone.total_tasks) || 0;
                                const doneTasks = Number(milestone.done_tasks) || 0;
                                const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

                                return (
                                    <div
                                        key={milestone.milestone_id}
                                        className="group/row flex cursor-pointer items-center border-b border-[var(--color-surface-hover)] py-1.5 pl-8 pr-4 transition-colors hover:bg-[var(--color-surface-container-low)]"
                                        onClick={() => setEditingMilestone(milestone)}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
                                            <div
                                                className="h-3.5 w-3.5 shrink-0 rotate-45 border-[1.5px] border-solid"
                                                style={{ borderColor: milestone.color ?? 'var(--color-tertiary)' }}
                                            />
                                            <span className="truncate text-[13px] font-medium text-[var(--color-on-surface)] transition-colors group-hover/row:text-[var(--color-accent)]">
                                                {milestone.name}
                                            </span>
                                        </div>

                                        {columns.dueDate && (
                                            <div className="flex min-h-6 w-32.5 shrink-0 items-center pl-2">
                                                {milestone.due_date ? (
                                                    <span className="text-[12px] font-medium text-[#ef4444]">
                                                        {formatDate(milestone.due_date)}
                                                    </span>
                                                ) : (
                                                    <Calendar size={13} className="text-[var(--color-border)]" />
                                                )}
                                            </div>
                                        )}

                                        <div className="flex min-h-6 w-30 shrink-0 items-center pl-2">
                                            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{
                                                backgroundColor: `${milestone.color ?? '#00D4AA'}22`,
                                                color: milestone.color ?? '#00D4AA',
                                            }}>
                                                {MILESTONE_STATUS_LABELS[milestone.status]}
                                            </span>
                                        </div>

                                        <div className="flex min-h-6 w-27.5 shrink-0 items-center pl-2">
                                            <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
                                                {doneTasks}/{totalTasks} ({progress}%)
                                            </span>
                                        </div>
                                        <div className="w-8 shrink-0" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {groups.map((group) => (
                    <div key={group.id} className="mb-8">
                        {/* ── Group Header ── */}
                        <div className="group flex cursor-pointer items-center gap-2 py-1 mb-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleGroup(group.id); }}
                                className="flex h-5 w-5 items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                            >
                                {group.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <div className="flex items-center gap-1.5 rounded-md bg-[var(--color-surface-hover)] px-2 py-1">
                                <div className="h-3.5 w-3.5 rounded-full border-[1.5px] border-dashed" style={{ borderColor: group.color }} />
                                <span className="text-[12px] font-semibold text-[var(--color-on-surface)]">{group.name}</span>
                            </div>
                            <span className="text-[12px] text-[var(--color-text-tertiary)] ml-1">{group.tasks.length}</span>
                        </div>

                        {group.isExpanded && (
                            <div className="flex flex-col">
                                {/* ── Column Headers ── */}
                                <div className="flex items-center border-b border-[var(--color-border-light)] py-2 pl-8 pr-4">
                                    <div className="flex-1 pr-4"><span className="text-[12px] font-semibold text-[#7c828d]">Name</span></div>
                                    {columns.assignee && <div className="w-30 shrink-0 pl-2"><span className="text-[12px] font-semibold text-[#7c828d]">Assignee</span></div>}
                                    {columns.dueDate && <div className="w-32.5 shrink-0 pl-2"><span className="text-[12px] font-semibold text-[#7c828d]">Due date</span></div>}
                                    {columns.priority && <div className="w-27.5 shrink-0 pl-2"><span className="text-[12px] font-semibold text-[#7c828d]">Priority</span></div>}
                                    <div className="w-8 shrink-0" />
                                </div>

                                {/* ── Task Rows ── */}
                                {group.tasks.map((task) => (
                                    <div
                                        key={task.task_id}
                                        className="group/row flex items-center border-b border-[var(--color-surface-hover)] py-1.5 pl-8 pr-4 hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer"
                                        onClick={() => setSelectedTaskId(task.task_id)}
                                        onContextMenu={(e) => onContextMenu(e, task)}
                                    >
                                        {/* Task Name */}
                                        <div className="flex-1 flex items-center gap-3 pr-4 min-w-0">
                                            <div
                                                className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-dashed"
                                                style={{ borderColor: task.status_color ?? '#9ca3af' }}
                                            />
                                            <span className="text-[13px] font-medium text-[var(--color-on-surface)] truncate group-hover/row:text-[var(--color-accent)] transition-colors">
                                                {task.name}
                                            </span>
                                        </div>

                                        {/* Assignee — display only */}
                                        {columns.assignee && (
                                            <div className="w-30 shrink-0 pl-2 flex items-center min-h-6">
                                                {task.assignees.length > 0 ? (
                                                    <div className="flex -space-x-1">
                                                        {task.assignees.map((a) => (
                                                            <Avatar
                                                                key={a.user_id}
                                                                size={22}
                                                                src={a.avatar_url}
                                                                style={{ backgroundColor: '#6c5ce7', fontSize: '9px', fontWeight: 700 }}
                                                            >
                                                                {!a.avatar_url && getInitials(a.name)}
                                                            </Avatar>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <User size={13} className="text-[var(--color-border)]" />
                                                )}
                                            </div>
                                        )}

                                        {/* Due Date — display only */}
                                        {columns.dueDate && (
                                            <div className="w-32.5 shrink-0 pl-2 flex items-center min-h-6">
                                                {task.due_date ? (
                                                    <span className="text-[12px] text-[#ef4444] font-medium">
                                                        {formatDate(task.due_date)}
                                                    </span>
                                                ) : (
                                                    <Calendar size={13} className="text-[var(--color-border)]" />
                                                )}
                                            </div>
                                        )}

                                        {/* Priority — display only */}
                                        {columns.priority && (
                                            <div className="w-27.5 shrink-0 pl-2 flex items-center min-h-6">
                                                {task.priority_name && task.priority_name !== 'Normal' ? (
                                                    <Flag
                                                        size={13}
                                                        color={task.priority_color ?? '#9ca3af'}
                                                        fill={task.priority_color ?? 'transparent'}
                                                    />
                                                ) : (
                                                    <Flag size={13} className="text-[var(--color-border)]" />
                                                )}
                                            </div>
                                        )}
                                        <div className="w-8 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* ── Add Status ── */}
                {!showAddStatus ? (
                    <button
                        onClick={() => setShowAddStatus(true)}
                        className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-border)] bg-transparent px-3 py-2 text-[12px] font-semibold text-[var(--color-text-tertiary)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[#f8f7ff]"
                    >
                        <Plus size={14} />
                        Add Status
                    </button>
                ) : (
                    <div className="mt-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] p-3">
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="h-4 w-4 rounded-full border-2 border-dashed" style={{ borderColor: newStatusColor }} />
                            <input
                                autoFocus
                                value={newStatusName}
                                onChange={(e) => setNewStatusName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newStatusName.trim()) {
                                        handleCreateStatus(newStatusName.trim(), newStatusColor);
                                        setNewStatusName('');
                                        setNewStatusColor(STATUS_COLORS[0]);
                                        setShowAddStatus(false);
                                    }
                                    if (e.key === 'Escape') {
                                        setShowAddStatus(false);
                                        setNewStatusName('');
                                    }
                                }}
                                placeholder="Status name..."
                                className="flex-1 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--color-on-surface)] outline-none focus:border-[var(--color-accent)] transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-1.5 mb-3">
                            {STATUS_COLORS.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setNewStatusColor(c)}
                                    className="h-5 w-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                                    style={{
                                        backgroundColor: c,
                                        borderColor: newStatusColor === c ? '#292d34' : 'transparent',
                                    }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (newStatusName.trim()) {
                                        handleCreateStatus(newStatusName.trim(), newStatusColor);
                                        setNewStatusName('');
                                        setNewStatusColor(STATUS_COLORS[0]);
                                        setShowAddStatus(false);
                                    }
                                }}
                                disabled={!newStatusName.trim()}
                                className="rounded-md border-none bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-bold text-white cursor-pointer transition-colors hover:bg-[#6c5ce7] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Create
                            </button>
                            <button
                                onClick={() => { setShowAddStatus(false); setNewStatusName(''); }}
                                className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <TaskDetailModal
                isOpen={!!selectedTask}
                task={selectedTask || null}
                onClose={() => setSelectedTaskId(null)}
                updateTask={updateTask}
            />
            <CreateMilestoneModal
                isOpen={!!editingMilestone}
                onClose={() => setEditingMilestone(null)}
                listId={listId}
                milestone={editingMilestone}
            />
        </div>
    );
}
