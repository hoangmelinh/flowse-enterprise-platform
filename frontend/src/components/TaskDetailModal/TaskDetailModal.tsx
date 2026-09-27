import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Paperclip, MessageSquare, Activity, Save, Clock, User, Tag, Flag, Calendar } from 'lucide-react';
import { Button, Input, Avatar, Spin } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import type { AppDispatch, RootState } from '@/store/configureStore';
import type { Task } from '@/types/tasks';
import type { ActivityAction } from '@/types/activityLogs';
import TaskDetailHeader from './TaskDetailHeader';
import TaskDetailSidebar from './TaskDetailSidebar';
import { fetchCommentsByTask, fetchCreateComment } from '@/store/modules/comments';
import { fetchActivitiesByTask, clearActivities } from '@/store/modules/activityLogs';
import { fetchAttachmentsByTask, fetchCreateAttachment, fetchDeleteAttachment } from '@/store/modules/tasks';
import { uploadFile } from '@/api/upload';
import ShareTaskModal from '../ShareTaskModal';

export interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    updateTask: (taskId: number, updates: Partial<Task>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_META: Record<ActivityAction, { labelKey: string; icon: React.ReactNode; color: string }> = {
    created:             { labelKey: 'activity.created',           icon: <Clock size={13} />,       color: '#7c68ee' },
    updated:             { labelKey: 'activity.updated',           icon: <Clock size={13} />,       color: '#52a7f9' },
    deleted:             { labelKey: 'activity.deleted',           icon: <Clock size={13} />,       color: '#ef4444' },
    status_changed:      { labelKey: 'activity.statusChanged',     icon: <Clock size={13} />,       color: '#f59e0b' },
    priority_changed:    { labelKey: 'activity.priorityChanged',   icon: <Flag size={13} />,        color: '#f97316' },
    assigned:            { labelKey: 'activity.assigned',          icon: <User size={13} />,        color: '#10b981' },
    unassigned:          { labelKey: 'activity.unassigned',        icon: <User size={13} />,        color: '#6b7280' },
    commented:           { labelKey: 'activity.commented',         icon: <MessageSquare size={13} />, color: '#7c68ee' },
    attachment_added:    { labelKey: 'activity.attachmentAdded',   icon: <Paperclip size={13} />,   color: '#52a7f9' },
    attachment_removed:  { labelKey: 'activity.attachmentRemoved', icon: <Paperclip size={13} />,   color: '#ef4444' },
    due_date_changed:    { labelKey: 'activity.dueDateChanged',    icon: <Calendar size={13} />,    color: '#f59e0b' },
    start_date_changed:  { labelKey: 'activity.startDateChanged',  icon: <Calendar size={13} />,    color: '#f59e0b' },
    moved:               { labelKey: 'activity.moved',             icon: <Clock size={13} />,       color: '#8b5cf6' },
    archived:            { labelKey: 'activity.archived',          icon: <Clock size={13} />,       color: '#6b7280' },
    restored:            { labelKey: 'activity.restored',          icon: <Clock size={13} />,       color: '#10b981' },
    timer_started:       { labelKey: 'activity.timerStarted',      icon: <Clock size={13} />,       color: '#10b981' },
    timer_stopped:       { labelKey: 'activity.timerStopped',      icon: <Clock size={13} />,       color: '#6b7280' },
    sprint_assigned:     { labelKey: 'activity.sprintAssigned',    icon: <Tag size={13} />,         color: '#7c68ee' },
    milestone_assigned:  { labelKey: 'activity.milestoneAssigned', icon: <Tag size={13} />,         color: '#f97316' },
    tag_added:           { labelKey: 'activity.tagAdded',          icon: <Tag size={13} />,         color: '#10b981' },
    tag_removed:         { labelKey: 'activity.tagRemoved',        icon: <Tag size={13} />,         color: '#ef4444' },
    subtask_added:       { labelKey: 'activity.subtaskAdded',      icon: <Clock size={13} />,       color: '#52a7f9' },
    story_points_changed:{ labelKey: 'activity.storyPointsChanged',icon: <Flag size={13} />,        color: '#8b5cf6' },
};

function formatRelativeTime(dateStr: string, lang: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (lang === 'vi') {
        if (mins < 1) return 'vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} ngày trước`;
    } else {
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins} min ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
    }
    return new Date(dateStr).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US');
}

function parseJsonValue(raw: unknown): string {
    if (raw == null || raw === '') return '';
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const named = obj.name ?? obj.title ?? obj.label ?? obj.value;
        if (named != null) return String(named);
        const firstVal = Object.values(obj)[0];
        return firstVal != null ? String(firstVal) : JSON.stringify(raw);
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object' && parsed !== null) {
                const obj = parsed as Record<string, unknown>;
                const named = obj.name ?? obj.title ?? obj.label ?? obj.value;
                if (named != null) return String(named);
                const firstVal = Object.values(obj)[0];
                return firstVal != null ? String(firstVal) : JSON.stringify(parsed);
            }
            return String(parsed);
        } catch {
            return raw;
        }
    }
    return String(raw);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TaskDetailModal({ isOpen, onClose, task, updateTask }: TaskDetailModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { t, i18n } = useTranslation('tasks');
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [commentContent, setCommentContent] = useState('');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const groups = useSelector((state: RootState) => state.tasks.listTask);
    const listComments = useSelector((state: RootState) => state.comments.listComments);
    const listActivities = useSelector((state: RootState) => state.activityLogs.listActivities);
    const isLoadingActivities = useSelector((state: RootState) => state.activityLogs.isLoadingActivities);

    // Attachments selectors
    const listAttachments = useSelector((state: RootState) => state.tasks.attachments);
    const isUploadingAttachment = useSelector((state: RootState) => state.tasks.isCreatingAttachment);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const statusOptions = useMemo(() => {
        return groups.map(g => ({ id: g.id, name: g.name, color: g.color }));
    }, [groups]);

    useEffect(() => {
        if (task) {
            setTaskTitle(task.name || '');
            setTaskDesc(task.description || '');
        }
    }, [task]);

    const isChanged = useMemo(() => {
        if (!task) return false;
        return taskTitle !== task.name || taskDesc !== (task.description || '');
    }, [taskTitle, taskDesc, task]);

    // Fetch comments and attachments when task opens
    useEffect(() => {
        if (task?.task_id) {
            dispatch(fetchCommentsByTask(task.task_id));
            dispatch(fetchAttachmentsByTask(task.task_id));
        }
    }, [task?.task_id, dispatch]);

    useEffect(() => {
        if (task?.task_id && activeTab === 'activity') {
            dispatch(fetchActivitiesByTask(task.task_id));
        }
    }, [task?.task_id, activeTab, dispatch]);

    useEffect(() => {
        if (!isOpen) {
            dispatch(clearActivities());
        }
    }, [isOpen, dispatch]);

    if (!isOpen || !task) return null;

    const handleUpdate = () => {
        if (!isChanged) return;
        updateTask(task.task_id, { name: taskTitle, description: taskDesc });
    };

    const handleCommentSubmit = async () => {
        if (!commentContent.trim() || !task?.task_id) return;
        await dispatch(fetchCreateComment({ taskId: task.task_id, content: commentContent }));
        setCommentContent('');
    };

    const handleFileUpload = async (file: File) => {
        if (!task?.task_id) return;
        try {
            const uploadRes = await uploadFile(file);
            const { file_name, file_url, file_size, mime_type } = uploadRes.file;
            await dispatch(fetchCreateAttachment({
                task_id: task.task_id,
                file_name,
                file_url,
                file_size,
                mime_type
            }));
        } catch (error) {
            console.error('Lỗi upload:', error);
            // Có thể thêm toast thông báo lỗi ở đây
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
        if (fileInputRef.current) fileInputRef.current.value = ''; // reset
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) {
            await dispatch(fetchDeleteAttachment(attachmentId));
        }
    };

    return (
        <div
            className="fixed inset-0 z-1500 flex items-center justify-center bg-[rgba(20,27,43,0.6)] backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`${isMaximized
                    ? 'h-screen max-h-screen w-screen max-w-screen rounded-none'
                    : 'max-h-[88vh] w-220 max-w-[95vw] rounded-[14px]'
                    } flex flex-col overflow-hidden bg-[var(--color-surface-container-lowest)] shadow-2xl transition-all duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                <TaskDetailHeader
                    task={task}
                    updateTask={updateTask}
                    statusOptions={statusOptions}
                    isMaximized={isMaximized}
                    onToggleMaximize={() => setIsMaximized(!isMaximized)}
                    onOpenShare={() => setIsShareModalOpen(true)}
                    onClose={onClose}
                />

                <div className="flex flex-1 overflow-hidden">
                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                        {isChanged && (
                            <div className="flex items-center justify-between rounded-lg bg-[var(--color-primary-bg)] p-3 border border-[var(--color-primary-border)]">
                                <span className="text-body-sm font-medium text-[var(--color-primary)]">
                                    {t('detail.unsavedChanges')}
                                </span>
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<Save size={14} />}
                                    onClick={handleUpdate}
                                    style={{ backgroundColor: 'var(--color-accent)', borderColor: 'transparent' }}
                                >
                                    {t('detail.update')}
                                </Button>
                            </div>
                        )}

                        <input
                            className="w-full border-b-2 border-transparent p-0 text-[22px] font-extrabold text-[var(--color-on-surface)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)] bg-transparent"
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder={t('detail.taskName')}
                        />

                        <div className="mt-1">
                            <h3 className="mb-2 text-caption font-bold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
                                {t('detail.description')}
                            </h3>
                            <textarea
                                className="min-h-25 w-full resize-y rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] p-3 text-body-sm leading-6 text-[var(--color-on-surface)] outline-none transition-colors placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent)]"
                                placeholder={t('detail.description') + '...'}
                                value={taskDesc}
                                onChange={(e) => setTaskDesc(e.target.value)}
                            />
                        </div>

                        {/* Attachments */}
                        <div className="mt-1">
                            <h3 className="mb-2 text-caption font-bold uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
                                {t('detail.attachments')}
                            </h3>
                            
                            <div className="flex flex-col gap-2 mb-3">
                                {listAttachments && listAttachments.map(att => (
                                    <div key={att.attachment_id} className="flex items-center justify-between p-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] group">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Paperclip size={14} className="text-[var(--color-text-secondary)] shrink-0" />
                                            <a href={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5001'}${att.file_url}`} target="_blank" rel="noreferrer" className="text-body-sm text-[var(--color-on-surface)] truncate hover:text-[var(--color-primary)] hover:underline">
                                                {att.file_name}
                                            </a>
                                            {att.file_size && <span className="text-caption text-[var(--color-text-tertiary)] shrink-0">({Math.round(att.file_size / 1024)} KB)</span>}
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteAttachment(att.attachment_id)}
                                            className="text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer p-0"
                                        >
                                            <span className="text-xs font-medium">{t('buttons.delete') || 'Delete'}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={handleFileChange}
                            />
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-[10px] border-2 border-dashed border-[var(--color-border)] p-6 text-center text-body-sm text-[var(--color-text-tertiary)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-text-secondary)] ${isUploadingAttachment ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                {isUploadingAttachment ? (
                                    <Spin size="small" />
                                ) : (
                                    <>
                                        <Paperclip size={20} className="opacity-50" />
                                        <p>{t('detail.dropFiles')}</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-2">
                            {/* Tab bar */}
                            <div className="mb-3 flex gap-0 border-b border-[var(--color-border-light)]">
                                <button
                                    onClick={() => setActiveTab('comments')}
                                    className={`flex items-center gap-1.5 px-3 pb-2.5 text-body-sm font-medium transition-colors cursor-pointer bg-transparent border-none ${activeTab === 'comments'
                                        ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-on-surface)]'
                                        }`}
                                >
                                    <MessageSquare size={14} /> {t('detail.comments')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`flex items-center gap-1.5 px-3 pb-2.5 text-body-sm font-medium transition-colors cursor-pointer bg-transparent border-none ${activeTab === 'activity'
                                        ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]'
                                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-on-surface)]'
                                        }`}
                                >
                                    <Activity size={14} /> {t('detail.activity')}
                                </button>
                            </div>

                            <div className="min-h-15">
                                {/* ── Comments Tab ── */}
                                {activeTab === 'comments' ? (
                                    <div className="flex flex-col gap-3">
                                        {listComments && listComments.length > 0 ? (
                                            listComments.map((comment) => (
                                                <div key={comment.comment_id} className="flex gap-2.5">
                                                    <Avatar src={comment.author_avatar} />
                                                    <div className="flex-1">
                                                        <div className="mb-1 flex items-center gap-2">
                                                            <strong className="text-body-sm text-[var(--color-on-surface)]">{comment.author_name}</strong>
                                                            <span className="text-caption text-[var(--color-text-tertiary)]">{comment.created_at}</span>
                                                        </div>
                                                        <p className="m-0 text-body-sm leading-6 text-[var(--color-on-surface)]">{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-body-sm text-[var(--color-text-tertiary)]">{t('detail.noComments')}</p>
                                        )}
                                    </div>
                                ) : (
                                    /* ── Activity Tab ── */
                                    <div className="flex flex-col gap-0">
                                        {isLoadingActivities ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Spin size="small" />
                                            </div>
                                        ) : listActivities.length === 0 ? (
                                            <p className="py-4 text-center text-body-sm text-[var(--color-text-tertiary)]">{t('detail.noActivity')}</p>
                                        ) : (
                                            listActivities.map((activity) => {
                                                const meta = ACTION_META[activity.action] ?? {
                                                    labelKey: activity.action,
                                                    icon: <Clock size={13} />,
                                                    color: '#6b7280',
                                                };
                                                const oldVal = parseJsonValue(activity.old_value);
                                                const newVal = parseJsonValue(activity.new_value);
                                                const displayName = activity.user_name ?? activity.username ?? (i18n.language === 'vi' ? 'Hệ thống' : 'System');
                                                const actionLabel = meta.labelKey.startsWith('activity.')
                                                    ? t(meta.labelKey, { defaultValue: activity.action })
                                                    : meta.labelKey;

                                                return (
                                                    <div
                                                        key={activity.activity_id}
                                                        className="relative flex items-start gap-3 py-3 pl-1 group"
                                                    >
                                                        {/* Timeline dot + line */}
                                                        <div className="flex flex-col items-center">
                                                            <div
                                                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                                                                style={{ backgroundColor: meta.color }}
                                                            >
                                                                {meta.icon}
                                                            </div>
                                                            <div className="mt-1 w-px flex-1 bg-[var(--color-border-light)] group-last:hidden" style={{ minHeight: 16 }} />
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 pt-0.5">
                                                            <p className="m-0 text-body-sm leading-[1.5] text-[var(--color-on-surface)]">
                                                                <span className="font-semibold">{displayName}</span>
                                                                {' '}
                                                                <span className="text-[var(--color-text-secondary)]">{actionLabel}</span>
                                                                {oldVal && newVal && (
                                                                    <>
                                                                        {' '}{i18n.language === 'vi' ? 'từ' : 'from'}{' '}
                                                                        <em className="not-italic font-semibold text-[var(--color-text-secondary)]">{oldVal}</em>
                                                                        {' '}{i18n.language === 'vi' ? 'sang' : 'to'}{' '}
                                                                        <em className="not-italic font-semibold" style={{ color: meta.color }}>{newVal}</em>
                                                                    </>
                                                                )}
                                                                {!oldVal && newVal && (
                                                                    <>
                                                                        {': '}
                                                                        <em className="not-italic font-semibold" style={{ color: meta.color }}>{newVal}</em>
                                                                    </>
                                                                )}
                                                            </p>
                                                            <span className="text-caption text-[var(--color-text-tertiary)]">
                                                                {formatRelativeTime(activity.created_at, i18n.language)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Comment input — only shown on comments tab */}
                            {activeTab === 'comments' && (
                                <div className="mt-3.5 flex gap-2.5 border-t border-[var(--color-border-light)] pt-3.5">
                                    <Avatar src="https://i.pravatar.cc/150?u=fake@pravatar.com" />
                                    <div className="flex flex-1 flex-col gap-1.5">
                                        <Input.TextArea
                                            placeholder={t('detail.writeComment')}
                                            autoSize={{ minRows: 2, maxRows: 6 }}
                                            className="text-body-sm"
                                            value={commentContent}
                                            onChange={(e) => setCommentContent(e.target.value)}
                                        />
                                        <div className="flex justify-end">
                                            <Button
                                                type="primary"
                                                size="small"
                                                style={{ backgroundColor: 'var(--color-accent)', borderColor: 'transparent', fontSize: '12px' }}
                                                onClick={handleCommentSubmit}
                                            >
                                                {t('detail.comments')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <TaskDetailSidebar task={task} updateTask={updateTask} />
                </div>
            </div>

            {isShareModalOpen && (
                <ShareTaskModal
                    taskId={task.task_id}
                    taskName={taskTitle || task.name || ''}
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                />
            )}
        </div>
    );
}