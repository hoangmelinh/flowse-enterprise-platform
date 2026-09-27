import { useState } from 'react';
import { User, Calendar, Flag } from 'lucide-react';
import { Popover, Avatar } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Task } from '@/types/tasks';
import AssigneePopover from '../Popovers/AssigneePopover';
import DueDatePopover from '../Popovers/DueDatePopover';
import PriorityPopover from '../Popovers/PriorityPopover';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/configureStore';

interface TaskDetailSidebarProps {
    task: Task;
    updateTask: (taskId: number, updates: Partial<Task>) => void;
}

export default function TaskDetailSidebar({ task, updateTask }: TaskDetailSidebarProps) {
    const { t, i18n } = useTranslation('tasks');
    const [openPopover, setOpenPopover] = useState<'assignee' | 'dueDate' | 'priority' | null>(null);
    const getInitials = (name?: string | null) => name ? name.substring(0, 2).toUpperCase() : 'NA';
    const formatDate = (date: string | null) =>
        date
            ? new Date(date).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { month: 'short', day: 'numeric' })
            : t('detail.setDate', { defaultValue: 'Set date' });
    const listMembers = useSelector((state: RootState) => state.workspaces.listWorkspaceMembers);

    const sectionLabel = 'text-caption font-bold uppercase tracking-[0.04em] text-[var(--color-text-tertiary)]';
    const rowBase = 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--color-surface-container-high)]';

    return (
        <div className="flex w-65 shrink-0 flex-col gap-4 overflow-y-auto border-l border-[var(--color-border-light)] p-4 bg-[var(--color-surface-container-low)]">
            <div className="flex flex-col gap-3">

                {/* Assignee */}
                <div className="flex flex-col gap-1">
                    <span className={sectionLabel}>{t('detail.assignee')}</span>
                    <Popover
                        content={
                            <AssigneePopover
                                allMembers={listMembers || []}
                                assignees={task.assignees || []}
                                onSave={(a) => updateTask(task.task_id, { assignees: a })}
                                onClose={() => setOpenPopover(null)}
                            />
                        }
                        trigger="click"
                        open={openPopover === 'assignee'}
                        onOpenChange={(v) => !v && setOpenPopover(null)}
                        placement="bottomLeft"
                        arrow={false}
                        getPopupContainer={(trigger) => trigger.parentElement!}
                    >
                        <div className={rowBase} onClick={() => setOpenPopover('assignee')}>
                            {task.assignees && task.assignees.length > 0 ? (
                                <div className="flex -space-x-1">
                                    {task.assignees.map((a) => (
                                        <Avatar
                                            key={a.user_id}
                                            size={24}
                                            src={a.avatar_url}
                                            style={{ backgroundColor: 'var(--color-accent)', fontSize: '10px', fontWeight: 'bold', border: '2px solid var(--color-surface-container-low)' }}
                                        >
                                            {!a.avatar_url && getInitials(a.name)}
                                        </Avatar>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <User size={14} className="text-[var(--color-text-tertiary)]" />
                                    <span className="text-body-sm font-medium text-[var(--color-text-secondary)]">
                                        {t('detail.assignPlaceholder', { defaultValue: 'Assign' })}
                                    </span>
                                </>
                            )}
                        </div>
                    </Popover>
                </div>

                {/* Due Date */}
                <div className="flex flex-col gap-1">
                    <span className={sectionLabel}>{t('detail.dueDate')}</span>
                    <Popover
                        content={
                            <DueDatePopover
                                date={task.due_date}
                                onSave={(d) => updateTask(task.task_id, { due_date: d })}
                                onClose={() => setOpenPopover(null)}
                            />
                        }
                        trigger="click"
                        open={openPopover === 'dueDate'}
                        onOpenChange={(v) => !v && setOpenPopover(null)}
                        placement="bottomLeft"
                        arrow={false}
                        getPopupContainer={(trigger) => trigger.parentElement!}
                    >
                        <div className={rowBase} onClick={() => setOpenPopover('dueDate')}>
                            <Calendar
                                size={14}
                                className={task.due_date ? 'text-[var(--color-error)]' : 'text-[var(--color-text-tertiary)]'}
                            />
                            <span className={`text-body-sm font-medium ${task.due_date ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}`}>
                                {formatDate(task.due_date)}
                            </span>
                        </div>
                    </Popover>
                </div>

                {/* Priority */}
                <div className="flex flex-col gap-1">
                    <span className={sectionLabel}>{t('detail.priority')}</span>
                    <Popover
                        content={
                            <PriorityPopover
                                priority_name={task.priority_name || 'Normal'}
                                onSave={(_id, name, color) => updateTask(task.task_id, { priority_name: name, priority_color: color })}
                                onClose={() => setOpenPopover(null)}
                            />
                        }
                        trigger="click"
                        open={openPopover === 'priority'}
                        onOpenChange={(v) => !v && setOpenPopover(null)}
                        placement="bottomLeft"
                        arrow={false}
                        getPopupContainer={(trigger) => trigger.parentElement!}
                    >
                        <div className={rowBase} onClick={() => setOpenPopover('priority')}>
                            <Flag
                                size={14}
                                fill={task.priority_name !== 'Clear' ? (task.priority_color ?? 'transparent') : 'none'}
                                color={task.priority_color ?? 'var(--color-text-tertiary)'}
                            />
                            <span className="text-body-sm font-medium" style={{ color: task.priority_color ?? 'var(--color-text-secondary)' }}>
                                {task.priority_name ? t(`priority.${task.priority_name.toLowerCase()}`, { defaultValue: task.priority_name }) : t('priority.normal')}
                            </span>
                        </div>
                    </Popover>
                </div>

            </div>
        </div>
    );
}