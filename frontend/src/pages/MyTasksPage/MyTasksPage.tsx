import { useEffect, useMemo, useState } from 'react';
import {
    Calendar, ChevronDown, ChevronRight,
    Plus, Search, Flag, User
} from 'lucide-react';
import { Avatar, Popover } from 'antd';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import TaskDetailModal from '@/components/TaskDetailModal/TaskDetailModal';
import CreateTaskModal from '@/components/Modal/CreateTaskModal';
import AssigneePopover from '@/components/Popovers/AssigneePopover';
import DueDatePopover from '@/components/Popovers/DueDatePopover';
import PriorityPopover from '@/components/Popovers/PriorityPopover';

import type { AppDispatch, RootState } from '@/store/configureStore';
import type { Task, NewTaskData, TabType, StatusGroup, Assignee } from '@/types/tasks';
import { fetchTasksForUser, fetchUpdateTask, fetchCreateTask } from '@/store/modules/tasks';
import { fetchMentionNotifications, fetchMarkNotificationAsRead, fetchMarkAllNotificationsAsRead } from '@/store/modules/notifications';
import { useSpaceTree } from '@/layouts/AppLayout/SpaceTreeContext';

/** --- HELPERS --- **/
const getInitials = (name?: string | null) => name ? name.substring(0, 2).toUpperCase() : 'NA';
const formatDate = (dateString: string | null, locale: string) => dateString ? new Date(dateString).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : null;

function isCompletedTask(task: Task): boolean {
    return (task.status_name ?? '').toUpperCase() === 'COMPLETE' || !!task.completed_at;
}

function isDueToday(rawDueDate: string | null): boolean {
    if (!rawDueDate) return false;
    const parsed = new Date(rawDueDate);
    if (Number.isNaN(parsed.getTime())) return rawDueDate === 'Today';
    const today = new Date();
    return parsed.getDate() === today.getDate() && parsed.getMonth() === today.getMonth() && parsed.getFullYear() === today.getFullYear();
}

const EMPTY_ARRAY: never[] = [];

export default function MyTasksPage() {
    const { t, i18n } = useTranslation('tasks');
    const { t: tc } = useTranslation('common');
    const dispatch = useDispatch<AppDispatch>();
    const { spaces: treeSpaces, spaceTree } = useSpaceTree();

    const listTasks = useSelector((state: RootState) => state.tasks.listTaskByUserId ?? EMPTY_ARRAY);
    const listMembers = useSelector((state: RootState) => state.workspaces.listWorkspaceMembers ?? EMPTY_ARRAY);
    const listSpaces = useSelector((state: RootState) => state.spaces.listSpaces ?? EMPTY_ARRAY);
    const currentUserId = useSelector((state: RootState) => state.auth.signIn?.user?.user_id);
    const mentionNotifications = useSelector((state: RootState) => state.notifications.mentionNotifications);
    const isLoadingMentions = useSelector((state: RootState) => state.notifications.isLoadingMentions);
    const mentionUnreadCount = useSelector((state: RootState) => state.notifications.mentionUnreadCount);

    const [activeTab, setActiveTab] = useState<TabType>('assigned');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [searchText, setSearchText] = useState('');
    const [showCompleted, setShowCompleted] = useState(true);
    const [activeSpaceId, setActiveSpaceId] = useState<number | null>(null);
    const [activePopover, setActivePopover] = useState<{ taskId: number, field: string } | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

    const columns = { assignee: true, dueDate: true, priority: true };

    // Gather all lists from the space tree for the CreateTaskModal
    const allLists = useMemo(() => {
        const result: { id: number; name: string }[] = [];
        for (const space of treeSpaces) {
            const node = spaceTree[space.id];
            if (!node) continue;
            node.standaloneLists.forEach(l => result.push({ id: Number(l.id), name: `${space.name} / ${l.name}` }));
            node.folders.forEach(f => f.lists.forEach(l => result.push({ id: Number(l.id), name: `${space.name} / ${f.name} / ${l.name}` })));
        }
        return result;
    }, [treeSpaces, spaceTree]);

    // Gather status groups for the modal
    const modalGroups = useMemo(() => {
        if (!Array.isArray(listTasks)) return [];
        return listTasks.map((g: StatusGroup) => ({ id: g.id, name: g.name, color: g.color }));
    }, [listTasks]);

    useEffect(() => {
        dispatch(fetchTasksForUser());
    }, [dispatch]);

    useEffect(() => {
        if (activeTab === 'mentions') {
            dispatch(fetchMentionNotifications());
        }
    }, [dispatch, activeTab]);


    useEffect(() => {
        if (listSpaces.length > 0 && activeSpaceId == null) {
            setActiveSpaceId(listSpaces[0].spaceId);
        }
    }, [listSpaces, activeSpaceId]);

    const flatTasks = useMemo(() => {
        if (!Array.isArray(listTasks)) return [];
        return listTasks.reduce((acc: Task[], group: StatusGroup) => acc.concat(group.tasks || []), []);
    }, [listTasks]);

    const totalActive = flatTasks.filter((t: Task) => !isCompletedTask(t)).length;
    const totalOverdue = flatTasks.filter((t: Task) => isDueToday(t.due_date) && !isCompletedTask(t)).length;

    const taskGroups = useMemo(() => {
        if (!Array.isArray(listTasks)) return [];

        return listTasks.map((group: StatusGroup) => {
            const filteredTasksInGroup = (group.tasks || []).filter((t: Task) => {
                if (!showCompleted && isCompletedTask(t)) return false;
                if (searchText && !t.name.toLowerCase().includes(searchText.toLowerCase())) return false;
                if (activeTab === 'assigned' && currentUserId) {
                    const isAssigned = (t.assignees || []).some((a: Assignee) => Number(a.user_id) === Number(currentUserId));
                    if (!isAssigned) return false;
                }
                if (activeTab === 'created' && currentUserId) {
                    if (Number(t.created_by) !== Number(currentUserId)) return false;
                }
                if (activeTab === 'mentions') {
                    // Mentions: chưa có hệ thống @mention, tạm thời không hiện task nào
                    return false;
                }
                return true;
            });

            return {
                ...group,
                isExpanded: expandedGroups[group.id] ?? group.isExpanded ?? true,
                tasks: filteredTasksInGroup
            };
        }).filter((group: StatusGroup) => group.tasks.length > 0);
    }, [listTasks, showCompleted, searchText, expandedGroups, activeTab, currentUserId]);

    const toggleGroup = (groupId: number) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: prev[groupId] !== undefined ? !prev[groupId] : false }));
    };

    const handleUpdateTask = (taskId: number, updates: Partial<Task>) => {
        // Build API payload - map frontend field names to backend field names
        const apiPayload: Partial<import('@/store/modules/tasks').TaskData> = {};
        if (updates.name !== undefined) apiPayload.name = updates.name;
        if (updates.description !== undefined) apiPayload.description = updates.description;
        if (updates.due_date !== undefined) apiPayload.due_date = updates.due_date;
        if (updates.status_id !== undefined) apiPayload.status_id = updates.status_id;
        if (updates.priority_name !== undefined) apiPayload.priority = updates.priority_name ?? undefined;
        if (updates.position !== undefined) apiPayload.position = updates.position;

        // Call API if there are valid fields to update
        if (Object.keys(apiPayload).length > 0) {
            dispatch(fetchUpdateTask({ task_id: taskId, updates: apiPayload }));
        }

        // Optimistic UI update for selectedTask
        if (selectedTask?.task_id === taskId) {
            setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    const handleCreateTask = (payload: NewTaskData) => {
        dispatch(fetchCreateTask({ list_id: payload.list_id, taskData: payload }))
            .unwrap()
            .then(() => {
                toast.success(t('create.createSuccess', { defaultValue: 'Đã tạo task!' }));
                dispatch(fetchTasksForUser());
            })
            .catch(() => toast.error(t('create.createFailed', { defaultValue: 'Tạo task thất bại' })));
        setIsCreateTaskOpen(false);
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[var(--color-surface-container-lowest)] font-['Plus_Jakarta_Sans',sans-serif]">
            <header className="shrink-0 border-b border-[var(--color-surface-container-highest)] bg-[var(--color-surface-container-lowest)]">
                <div className="flex items-center justify-between px-6 pb-2 pt-3.5">
                    <div className="flex items-center gap-3.5">
                        <h1 className="m-0 text-h2 font-extrabold text-[var(--color-on-surface)]">{t('myTasks.title', { defaultValue: 'My Tasks' })}</h1>
                        <div className="flex items-center gap-1.5 text-caption font-semibold text-[var(--color-text-secondary)]">
                            <span><b className="text-[var(--color-on-surface)]">{totalActive}</b> {t('myTasks.active', { defaultValue: 'active' })}</span>
                            <span className="text-[var(--color-text-tertiary)]">·</span>
                            <span><b className="text-[var(--color-error)]">{totalOverdue}</b> {t('myTasks.dueToday', { defaultValue: 'due today' })}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-2 py-1 text-caption font-semibold text-[var(--color-on-surface)] outline-none"
                            value={activeSpaceId ?? ''}
                            onChange={(e) => setActiveSpaceId(Number(e.target.value))}
                        >
                            {listSpaces.map((space) => (
                                <option key={space.spaceId} value={space.spaceId}>{space.name}</option>
                            ))}
                        </select>
                        <button
                            className="flex items-center gap-1.5 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-3 py-1 text-caption font-semibold text-white hover:bg-[var(--color-primary-hover)] transition-colors cursor-pointer"
                            onClick={() => setIsCreateTaskOpen(true)}
                        >
                            <Plus size={14} /> {t('create.createTask', { defaultValue: 'Add Task' })}
                        </button>
                    </div>
                </div>
                <div className="flex gap-1 px-6">
                    {(['assigned', 'mentions'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            className={`px-3 py-2 text-body-sm font-semibold border-b-2 transition-all cursor-pointer bg-transparent ${activeTab === tab ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-secondary)]'}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'assigned' ? t('myTasks.assigned', { defaultValue: 'Assigned to me' }) : (
                                <span className="flex items-center gap-1">
                                    {t('myTasks.mentions', { defaultValue: 'Mentions' })}
                                    {mentionUnreadCount > 0 && (
                                        <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-error)] px-1 text-micro font-bold text-white">
                                            {mentionUnreadCount > 99 ? '99+' : mentionUnreadCount}
                                        </span>
                                    )}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex items-center justify-between border-b border-[var(--color-surface-container-highest)] px-6 py-2 bg-[var(--color-surface-container-lowest)]">
                <div className="flex min-w-50 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-container-low)] px-2.5 py-1">
                    <Search size={14} className="text-[var(--color-text-tertiary)]" />
                    <input
                        className="bg-transparent text-caption outline-none w-full text-[var(--color-on-surface)] placeholder-[var(--color-text-tertiary)]"
                        placeholder={tc('search.placeholder')}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="text-caption font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-on-surface)] cursor-pointer bg-transparent border-none" onClick={() => setShowCompleted(!showCompleted)}>
                        {showCompleted ? t('myTasks.hideCompleted', { defaultValue: 'Hide Completed' }) : t('myTasks.showCompleted', { defaultValue: 'Show Completed' })}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-surface-container-lowest)]">
                {activeTab === 'mentions' ? (
                    <div className="flex flex-col">
                        {/* Header row */}
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-body-sm font-semibold text-[var(--color-on-surface)]">
                                {t('notifications.title', { defaultValue: 'Thông báo' })}
                                {mentionUnreadCount > 0 && (
                                    <span className="ml-2 rounded-full bg-[var(--color-error)] px-2 py-0.5 text-micro font-bold text-white">
                                        {mentionUnreadCount} {t('notifications.unread', { defaultValue: 'chưa đọc' })}
                                    </span>
                                )}
                            </p>
                            {mentionUnreadCount > 0 && (
                                <button
                                    className="text-caption font-semibold text-[var(--color-primary)] hover:underline bg-transparent border-0 cursor-pointer"
                                    onClick={() => dispatch(fetchMarkAllNotificationsAsRead()).then(() => dispatch(fetchMentionNotifications()))}
                                >
                                    {t('notifications.markAllRead', { defaultValue: 'Đánh dấu tất cả đã đọc' })}
                                </button>
                            )}
                        </div>

                        {/* Loading state */}
                        {isLoadingMentions && (
                            <div className="flex flex-col gap-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 animate-pulse rounded-lg bg-[var(--color-surface-container-low)]" />
                                ))}
                            </div>
                        )}

                        {/* Empty state */}
                        {!isLoadingMentions && mentionNotifications.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-tertiary)]">
                                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-bg)]">
                                    <span className="text-2xl">🔔</span>
                                </div>
                                <p className="text-body-sm font-semibold text-[var(--color-text-secondary)]">{t('notifications.emptyTitle', { defaultValue: 'Chưa có thông báo nào' })}</p>
                                <p className="mt-1 text-caption text-[var(--color-text-tertiary)]">{t('notifications.emptyDesc', { defaultValue: 'Thông báo khi bạn được giao task hoặc task sắp đến hạn sẽ hiện ở đây.' })}</p>
                            </div>
                        )}

                        {/* Notification list */}
                        {!isLoadingMentions && mentionNotifications.map((notif) => (
                            <div
                                key={notif.notification_id}
                                className={`mb-2 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-bg)] ${notif.is_read
                                    ? 'border-[var(--color-border)] bg-[var(--color-surface-container-lowest)]'
                                    : 'border-[var(--color-primary-border)] bg-[var(--color-primary-bg)]'
                                    }`}
                                onClick={() => {
                                    if (!notif.is_read) {
                                        dispatch(fetchMarkNotificationAsRead(notif.notification_id));
                                    }
                                }}
                            >
                                {/* Icon */}
                                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${notif.type === 'task_deadline'
                                    ? 'bg-[#fef3c7]'
                                    : 'bg-[var(--color-tertiary-bg)]'
                                    }`}>
                                    {notif.type === 'task_deadline' ? '⏰' : '🔔'}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-body-sm leading-snug ${notif.is_read ? 'text-[var(--color-text-secondary)]' : 'font-semibold text-[var(--color-on-surface)]'
                                        }`}>
                                        {notif.content}
                                    </p>
                                    {notif.actor_name && (
                                        <p className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
                                            {t('notifications.by', { defaultValue: 'Bởi' })}: {notif.actor_name}
                                        </p>
                                    )}
                                    <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)] opacity-70">
                                        {new Date(notif.created_at).toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>

                                {/* Unread dot */}
                                {!notif.is_read && (
                                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                                )}
                            </div>
                        ))}
                    </div>
                ) : taskGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[var(--color-text-tertiary)]">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-bg)]">
                            <span className="text-2xl">{activeTab === 'assigned' ? '📋' : '✏️'}</span>
                        </div>
                        <p className="text-body-sm font-semibold text-[var(--color-text-secondary)]">
                            {activeTab === 'assigned' ? t('myTasks.emptyAssignedTitle', { defaultValue: 'Không có task nào được giao cho bạn' }) : t('myTasks.emptyCreatedTitle', { defaultValue: 'Bạn chưa tạo task nào' })}
                        </p>
                        <p className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                            {activeTab === 'assigned' ? t('myTasks.emptyAssignedDesc', { defaultValue: 'Các task được giao (assign) cho bạn sẽ xuất hiện ở đây.' }) : t('myTasks.emptyCreatedDesc', { defaultValue: 'Những task do bạn tạo sẽ xuất hiện ở đây.' })}
                        </p>
                    </div>
                ) : null}

                {taskGroups.map((group) => (
                    <div key={group.id} className="mb-8">
                        <div
                            className="group flex cursor-pointer items-center gap-2 py-1 mb-2 select-none"
                            onClick={() => toggleGroup(group.id)}
                        >
                            <button className="flex h-5 w-5 items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors bg-transparent border-0">
                                {group.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <div className="flex items-center gap-1.5 rounded-md bg-[var(--color-surface-container-low)] px-2 py-1">
                                <div className="h-3.5 w-3.5 rounded-full border-[1.5px] border-dashed" style={{ borderColor: group.color || 'var(--color-text-tertiary)' }} />
                                <span className="text-caption font-semibold text-[var(--color-on-surface)]">{group.name}</span>
                            </div>
                            <span className="text-caption text-[var(--color-text-tertiary)] ml-1">{group.tasks.length}</span>
                        </div>

                        {group.isExpanded && (
                            <div className="flex flex-col">
                                <div className="flex items-center border-b border-[var(--color-border)] py-2 pl-8 pr-4">
                                    <div className="flex-1 pr-4"><span className="text-caption font-semibold text-[var(--color-text-secondary)]">{t('myTasks.nameCol', { defaultValue: 'Name' })}</span></div>
                                    {columns.assignee && <div className="w-30 shrink-0 pl-2"><span className="text-caption font-semibold text-[var(--color-text-secondary)]">{t('myTasks.assigneeCol', { defaultValue: 'Assignee' })}</span></div>}
                                    {columns.dueDate && <div className="w-32.5 shrink-0 pl-2"><span className="text-caption font-semibold text-[var(--color-text-secondary)]">{t('myTasks.dueDateCol', { defaultValue: 'Due date' })}</span></div>}
                                    {columns.priority && <div className="w-27.5 shrink-0 pl-2"><span className="text-caption font-semibold text-[var(--color-text-secondary)]">{t('myTasks.priorityCol', { defaultValue: 'Priority' })}</span></div>}
                                </div>

                                {group.tasks.map((task: Task) => (
                                    <div
                                        key={task.task_id}
                                        className="group/row flex items-center border-b border-[var(--color-surface-container-high)] py-1.5 pl-8 pr-4 hover:bg-[var(--color-surface-container-low)] transition-colors cursor-pointer"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <div className="flex-1 flex items-center gap-3 pr-4">
                                            <div className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-dashed" style={{ borderColor: task.status_color || group.color || 'var(--color-text-tertiary)' }} />
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-body-sm font-medium truncate hover:text-[var(--color-tertiary)] ${isCompletedTask(task) ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-on-surface)]'}`}>
                                                    {task.name}
                                                </span>
                                                <span className="text-micro font-bold" style={{ color: task.space_color || 'var(--color-text-tertiary)' }}>
                                                    {task.space_name || t('myTasks.noProject', { defaultValue: 'No Project' })}
                                                </span>
                                            </div>
                                        </div>

                                        {columns.assignee && (
                                            <div className="w-30 shrink-0 pl-2">
                                                <Popover content={<AssigneePopover allMembers={listMembers} assignees={task.assignees || []} onSave={(a) => handleUpdateTask(task.task_id, { assignees: a })} onClose={() => setActivePopover(null)} />} trigger="click" open={activePopover?.taskId === task.task_id && activePopover?.field === 'assignee'} onOpenChange={(v) => !v && setActivePopover(null)} placement="bottomLeft" arrow={false} >
                                                    <div className="flex min-h-6 items-center px-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors" onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: task.task_id, field: 'assignee' }); }}>
                                                        {task.assignees?.length > 0 ? (
                                                            <div className="flex -space-x-1">
                                                                {task.assignees.map((a: Assignee) => (
                                                                    <Avatar key={a.user_id} size={24} src={a.avatar_url} style={{ backgroundColor: 'var(--color-surface-variant)', fontSize: '10px' }} className="border-2 border-[var(--color-surface-container-lowest)]">
                                                                        {!a.avatar_url && getInitials(a.name)}
                                                                    </Avatar>
                                                                ))}
                                                            </div>
                                                        ) : <User size={12} className="text-[var(--color-text-tertiary)]" />}
                                                    </div>
                                                </Popover>
                                            </div>
                                        )}

                                        {columns.dueDate && (
                                            <div className="w-32.5 shrink-0 pl-2">
                                                <Popover content={<DueDatePopover date={task.due_date} onSave={(d) => handleUpdateTask(task.task_id, { due_date: d })} onClose={() => setActivePopover(null)} />} trigger="click" open={activePopover?.taskId === task.task_id && activePopover?.field === 'dueDate'} onOpenChange={(v) => !v && setActivePopover(null)} placement="bottomLeft" arrow={false} >
                                                    <div className="flex min-h-6 items-center px-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors" onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: task.task_id, field: 'dueDate' }); }}>
                                                        {task.due_date ? (
                                                            <span className={`text-caption font-medium ${isDueToday(task.due_date) ? 'text-[var(--color-error)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                                {formatDate(task.due_date, i18n.language)}
                                                            </span>
                                                        ) : <Calendar size={14} className="text-[var(--color-text-tertiary)] opacity-50" />}
                                                    </div>
                                                </Popover>
                                            </div>
                                        )}

                                        {columns.priority && (
                                            <div className="w-27.5 shrink-0 pl-2">
                                                <Popover content={<PriorityPopover priority_name={task.priority_name} onSave={(_id: number | null, name: string | null, color: string | null) => handleUpdateTask(task.task_id, { priority_name: name, priority_color: color })} onClose={() => setActivePopover(null)} />} trigger="click" open={activePopover?.taskId === task.task_id && activePopover?.field === 'priority'} onOpenChange={(v) => !v && setActivePopover(null)} placement="bottomLeft" arrow={false} >
                                                    <div className="flex min-h-6 items-center px-1 rounded hover:bg-[var(--color-surface-hover)] transition-colors" onClick={(e) => { e.stopPropagation(); setActivePopover({ taskId: task.task_id, field: 'priority' }); }}>
                                                        {task.priority_name && task.priority_name !== 'Clear' ? (
                                                            <Flag size={14} color={task.priority_color ?? 'var(--color-text-tertiary)'} fill={task.priority_color ?? 'transparent'} />
                                                        ) : <Flag size={14} className="text-[var(--color-text-tertiary)] opacity-50" />}
                                                    </div>
                                                </Popover>
                                            </div>
                                        )}
                                        <div className="w-8 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <TaskDetailModal
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                task={selectedTask || null}
                updateTask={handleUpdateTask}
            />

            <CreateTaskModal
                isOpen={isCreateTaskOpen}
                onClose={() => setIsCreateTaskOpen(false)}
                onCreate={handleCreateTask}
                groups={modalGroups}
                lists={allLists}
                defaultListId={allLists.length > 0 ? allLists[0].id : undefined}
            />
        </div>
    );
}
