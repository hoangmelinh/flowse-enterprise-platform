import { X, ChevronRight, Minimize2, Maximize2, MoreHorizontal } from 'lucide-react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { StatusPicker } from '@/components/Pickers';
import type { Task } from '@/types/tasks';

interface TaskDetailHeaderProps {
    task: Task;
    updateTask: (taskId: number, updates: Partial<Task>) => void;
    statusOptions: { id: number; name: string; color: string }[];
    isMaximized: boolean;
    onToggleMaximize: () => void;
    onOpenShare: () => void;
    onClose: () => void;
}

export default function TaskDetailHeader({
    task,
    updateTask,
    statusOptions,
    isMaximized,
    onToggleMaximize,
    onOpenShare,
    onClose,
}: TaskDetailHeaderProps) {
    const { t } = useTranslation('tasks');

    const iconBtn = 'flex cursor-pointer items-center rounded-md border-none bg-transparent p-1.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)] transition-colors';

    return (
        <div className="shrink-0 border-b border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-4.5 py-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-1 text-caption text-[var(--color-text-tertiary)]">
                        <span>{task.space_name || 'Space'}</span>
                        <ChevronRight size={12} />
                        <span>{task.list_name || 'List'}</span>
                    </div>

                    <StatusPicker
                        variant="badge"
                        value={task.status_id ?? 0}
                        options={statusOptions}
                        onChange={(newId) => updateTask(task.task_id, { status_id: newId })}
                    />
                </div>

                <div className="flex items-center gap-0.5">
                    <Tooltip title={isMaximized ? t('detail.minimize') : t('detail.maximize')}>
                        <button className={iconBtn} onClick={onToggleMaximize}>
                            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                    </Tooltip>
                    <Tooltip title={t('share.title')}>
                        <button className={iconBtn} onClick={onOpenShare}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                            </svg>
                        </button>
                    </Tooltip>
                    <Tooltip title="Options">
                        <button className={iconBtn}>
                            <MoreHorizontal size={16} />
                        </button>
                    </Tooltip>
                    <button
                        className="flex cursor-pointer items-center rounded-md border-none bg-transparent p-1.5 text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-500 transition-colors"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}