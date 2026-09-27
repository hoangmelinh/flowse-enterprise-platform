import { Calendar, Flag, MoreHorizontal } from 'lucide-react';
import { Avatar, Tooltip } from 'antd';
import { useRef, useState, type DragEvent } from 'react';
import type { Task, Assignee } from '@/types/tasks';
import TaskDetailModal from '@/components/TaskDetailModal/TaskDetailModal';

import { useTaskView } from '../ListViewPage';
export default function BoardView({
    showClosed
}: {
    showClosed: boolean
}) {
    const {
        groups,
        setGroups,
        updateTask,
        onContextMenu,
    } = useTaskView();

    const dragItem = useRef<{ fromGroupId: number; taskId: number } | null>(null);
    const [dragOverGroup, setDragOverGroup] = useState<number | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    // Lọc các cột đã đóng
    const displayGroups = showClosed ? groups : groups.filter((g) => g.name?.toLowerCase() !== 'done');

    const onDragStart = (e: DragEvent, groupId: number, taskId: number) => {
        dragItem.current = { fromGroupId: groupId, taskId };
        e.dataTransfer.effectAllowed = 'move';
        (e.currentTarget as HTMLElement).style.opacity = '0.5';
    };

    const onDragEnd = (e: DragEvent) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
        setDragOverGroup(null);
    };

    const onDrop = (e: DragEvent, toGroupId: number) => {
        e.preventDefault();
        setDragOverGroup(null);
        if (!dragItem.current) return;

        const { fromGroupId, taskId } = dragItem.current;
        if (fromGroupId === toGroupId) {
            dragItem.current = null;
            return;
        }

        // Cập nhật UI ngay lập tức (Optimistic UI)
        setGroups((prev) => {
            const fromG = prev.find((g) => g.id === fromGroupId);
            const toG = prev.find((g) => g.id === toGroupId);
            if (!fromG || !toG) return prev;

            const moving = fromG.tasks.filter((t) => t.task_id === taskId);
            const restFrom = fromG.tasks.filter((t) => t.task_id !== taskId);

            const updatedMoving = moving.map((t) => ({
                ...t,
                status_id: toG.id,
                status_name: toG.name,
                status_color: toG.color,
            }));

            return prev.map((g) => {
                if (g.id === fromGroupId) return { ...g, tasks: restFrom };
                if (g.id === toGroupId) return { ...g, tasks: [...g.tasks, ...updatedMoving] };
                return g;
            });
        });

        // GỌI API BẰNG HÀM TỪ HOOK
        updateTask(taskId, { status_id: toGroupId });

        dragItem.current = null;
    };

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex flex-1 items-start gap-3 overflow-x-auto px-5 py-4">
                {displayGroups.map((group) => {
                    return (
                        <div
                            key={group.id}
                            className={`w-70 shrink-0 overflow-hidden rounded-[10px] border-2 transition-colors ${dragOverGroup === group.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]' : 'border-transparent bg-[var(--color-surface-container-low)]'
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setDragOverGroup(group.id); }}
                            onDragLeave={() => setDragOverGroup(null)}
                            onDrop={(e) => onDrop(e, group.id)}
                        >
                            <div className="flex items-center justify-between px-3.5 py-2.5">
                                <div className="flex items-center gap-1.75">
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color || '#ccc' }} />
                                    <span className="text-xs font-extrabold uppercase tracking-[0.04em] text-[var(--color-on-surface)]">{group.name}</span>
                                    <span className="rounded-full bg-[var(--color-surface-container-high)] px-1.25 py-px text-[11px] font-bold text-[var(--color-text-secondary)]">{group.tasks.length}</span>
                                </div>
                                <div className="flex gap-0.5">
                                    <button className="rounded p-0.75 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)]"><MoreHorizontal size={14} /></button>
                                </div>
                            </div>

                            <div className="flex max-h-[calc(100vh-260px)] flex-col gap-1.5 overflow-y-auto px-2 pb-2">
                                {group.tasks.map((task) => (
                                    <div
                                        key={task.task_id}
                                        className="cursor-pointer rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                                        draggable
                                        onDragStart={(e) => onDragStart(e, group.id, task.task_id)}
                                        onDragEnd={onDragEnd}
                                        onClick={() => setSelectedTask(task)}
                                        onContextMenu={(e) => onContextMenu(e, task)}
                                    >
                                        <div className="mb-1.5 text-[13px] font-semibold text-[var(--color-on-surface)]">{task.name}</div>
                                        <div className="mb-2 text-[15px] text-[#dcdfe4]"><span>≡</span></div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {task.due_date && (
                                                <span className="flex items-center gap-1 rounded bg-[var(--color-surface-container-low)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]">
                                                    <Calendar size={11} /> {new Date(task.due_date).toLocaleDateString()}
                                                </span>
                                            )}
                                            {task.priority_name && task.priority_name !== 'Normal' && (
                                                <span className="flex items-center gap-1 text-[11px] font-semibold" >
                                                    <Flag size={11} /> {task.priority_name}
                                                </span>
                                            )}
                                            {task.assignees?.map((a: Assignee) => (
                                                <Tooltip key={a.user_id} title={a.name}>
                                                    <Avatar size={20} src={a.avatar_url || undefined} style={{ backgroundColor: '#1e1f21' }}>
                                                        {a.name?.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <TaskDetailModal
                isOpen={!!selectedTask}
                task={selectedTask || null}
                onClose={() => setSelectedTask(null)}
                updateTask={updateTask}
            />
        </div>
    );
}
