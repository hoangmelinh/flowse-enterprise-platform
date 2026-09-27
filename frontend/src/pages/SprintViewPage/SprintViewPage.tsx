import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Plus, Zap,
    ChevronDown,
} from 'lucide-react';

import { useSpaceTree } from '../../layouts/AppLayout/SpaceTreeContext';
import PageHeader, { LIST_TABS } from '../../components/PageHeader/PageHeader';
import ContextMenu from '../../components/ContextMenu/ContextMenu';
import CreateTaskModal from '../../components/Modal/CreateTaskModal';
import BoardView from './components/BoardView';
import ListView from './components/ListView';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import type { AppDispatch, RootState } from '@/store/configureStore';
import { fetchTasksForSprint, fetchCreateTask, fetchUpdateTask, fetchDeleteTask, fetchAddAssignee, fetchRemoveAssignee } from '@/store/modules/tasks';
import { createTaskStatus } from '@/api/statuses';
import type { Task, StatusGroup, NewTaskData, Assignee, TaskViewContextType } from '@/types/tasks';

// eslint-disable-next-line react-refresh/only-export-components
export const TaskViewContext = createContext<TaskViewContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useTaskView = () => {
    const context = useContext(TaskViewContext);
    if (!context) throw new Error('useTaskView must be used within TaskViewProvider');
    return context;
};

export default function SprintViewPage() {
    const { sprintId, spaceId } = useParams<{ sprintId: string; spaceId: string }>();
    const { t } = useTranslation('tasks');
    const { spaces } = useSpaceTree();
    const dispatch = useDispatch<AppDispatch>();
    const listTasks = useSelector((state: RootState) => state.tasks.listTask);
    const sprints = useSelector((state: RootState) => state.sprints.listSprints);

    const [groups, setGroups] = useState<StatusGroup[]>([]);
    const [, setSelectedTask] = useState<Task | null>(null);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; task: Task } | null>(null);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [showClosed] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'board'>('list');

    const columns = { assignee: true, dueDate: true, priority: true };

    const parentSpace = spaces.find(s => s.id === spaceId) || null;
    const sprintInfo = sprints.find(s => s.sprint_id === Number(sprintId)) || null;

    const updateTask = useCallback((taskId: number, updates: Partial<Task>) => {
        // Optimistic UI update
        setGroups((prevGroups) => {
            let taskToMove: Task | null = null;
            const newGroups = prevGroups.map((group) => {
                const tIdx = group.tasks.findIndex((t) => t.task_id === taskId);
                if (tIdx !== -1) {
                    const updatedTask = { ...group.tasks[tIdx], ...updates };
                    if (updates.status_id && updates.status_id !== group.id) {
                        taskToMove = updatedTask;
                        return { ...group, tasks: group.tasks.filter((t) => t.task_id !== taskId) };
                    }
                    const newTasks = [...group.tasks];
                    newTasks[tIdx] = updatedTask;
                    return { ...group, tasks: newTasks };
                }
                return group;
            });
            if (taskToMove && updates.status_id) {
                return newGroups.map((g) =>
                    g.id === updates.status_id ? { ...g, tasks: [...g.tasks, taskToMove!] } : g
                );
            }
            return newGroups;
        });

        // Assignees: xử lý add/remove riêng vì API update task không nhận assignees
        if (updates.assignees !== undefined) {
            const currentTask = groups.flatMap(g => g.tasks).find(t => t.task_id === taskId);
            const prevIds = (currentTask?.assignees || []).map(a => String(a.user_id));
            const nextIds = updates.assignees.map(a => String(a.user_id));
            const toAdd = nextIds.filter(id => !prevIds.includes(id));
            const toRemove = prevIds.filter(id => !nextIds.includes(id));
            toAdd.forEach(userId => dispatch(fetchAddAssignee({ task_id: taskId, userId })));
            toRemove.forEach(userId => dispatch(fetchRemoveAssignee({ task_id: taskId, userId })));
        }

        // Các field scalar: gửi lên API
        const apiPayload: Partial<import('@/store/modules/tasks').TaskData> = {};
        if (updates.name !== undefined) apiPayload.name = updates.name;
        if (updates.description !== undefined) apiPayload.description = updates.description;
        if (updates.due_date !== undefined) apiPayload.due_date = updates.due_date;
        if (updates.status_id !== undefined) apiPayload.status_id = updates.status_id;
        if (updates.priority_name !== undefined) apiPayload.priority = updates.priority_name ?? undefined;
        if (updates.position !== undefined) apiPayload.position = updates.position;

        if (Object.keys(apiPayload).length > 0) {
            dispatch(fetchUpdateTask({ task_id: taskId, updates: apiPayload, frontendUpdates: updates }));
        }
    }, [dispatch, groups]);

    const handleInlineCreate = useCallback((groupId: number, name: string, extras?: { assignees?: Assignee[]; due_date?: string | null; priority_id?: number | null; priority_name?: string | null; priority_color?: string | null }) => {
        const payload: NewTaskData = {
            name,
            list_id: 0, // Not tied to a specific list by default in sprint view, though technically tasks should belong to lists. We'll leave it 0 or require a list selector if needed.
            status_id: groupId,
            priority: extras?.priority_name || 'Normal',
            due_date: extras?.due_date || null,
            assignee_ids: extras?.assignees?.map((a: Assignee) => a.user_id) || []
        };


        const tempId = Math.floor(Math.random() * 100000);
        const newTask: Task = {
            task_id: tempId,
            parent_task_id: null,
            list_id: 0,
            space_id: Number(spaceId) || 0,
            folder_id: null,
            name: name,
            description: null,
            status_id: groupId,
            status_name: groups.find(g => g.id === groupId)?.name || '',
            status_color: groups.find(g => g.id === groupId)?.color || '#ccc',

            priority_name: payload.priority || 'Normal',
            priority_color: extras?.priority_color || '#3b82f6',

            due_date: payload.due_date || null,
            position: 0,
            subtask_count: 0,
            subtask_done_count: 0,
            comment_count: 0,
            attachment_count: 0,
            assignees: extras?.assignees || []
        };

        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, tasks: [...g.tasks, newTask] } : g));

        dispatch(fetchCreateTask({
            list_id: payload.list_id,
            taskData: payload
        }));
    }, [spaceId, groups, dispatch]);

    const handleCreateTask = useCallback((payload: NewTaskData) => {

        dispatch(fetchCreateTask({
            list_id: payload.list_id,
            taskData: payload
        }));

        setIsCreateTaskOpen(false);

    }, [dispatch]);
    const handleCreateStatus = useCallback(async (name: string, color: string) => {
        const numSpaceId = Number(spaceId);
        if (!numSpaceId) return;
        try {
            const newStatus = await createTaskStatus(numSpaceId, {
                statusName: name,
                color: color,
            });
            // Add the new status group to the UI
            setGroups(prev => [...prev, {
                id: newStatus.status_id,
                name: newStatus.status_name,
                color: newStatus.color || color,
                isExpanded: true,
                tasks: [],
            }]);
            toast.success(`Đã tạo status "${name}"`);
        } catch {
            toast.error('Không thể tạo status');
        }
    }, [spaceId]);

    const onTaskContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, task });
    };

    const onContextActionSelect = (action: string) => {
        if (!ctxMenu) return;
        if (action === 'delete') {
            setGroups(prev => prev.map(g => ({ ...g, tasks: g.tasks.filter(t => t.task_id !== ctxMenu.task.task_id) })));
            dispatch(fetchDeleteTask(ctxMenu.task.task_id));
        }
        setCtxMenu(null);
    };

    useEffect(() => {
        if (spaceId && sprintId) {
            dispatch(fetchTasksForSprint({ spaceId: Number(spaceId), sprintId: Number(sprintId) }));
        }
    }, [dispatch, spaceId, sprintId]);


    useEffect(() => {
        if (listTasks.length > 0) {
            setGroups(listTasks);
        } else {
            setGroups([]);
        }
    }, [listTasks]);

    if (!parentSpace || !sprintInfo) {
        return <div className="flex h-full items-center justify-center text-[var(--color-text-secondary)]"><p>Sprint not found</p></div>;
    }

    const contextValue: TaskViewContextType = {
        groups, setGroups,
        listId: 0, // 0 for Sprint view context since it's not a single list
        showClosed, columns,
        setSelectedTask, onContextMenu: onTaskContextMenu,
        updateTask, handleInlineCreate, handleCreateStatus
    };

    return (
        <TaskViewContext.Provider value={contextValue}>
            <div className="flex h-full flex-col overflow-hidden bg-[var(--color-surface-container-lowest)]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

                <PageHeader
                    parentSpace={parentSpace}
                    parentFolder={null}
                    entityIcon={<Zap size={16} />}
                    entityName={sprintInfo.name}
                    tabs={[
                        { ...LIST_TABS[0], active: activeTab === 'list', onClick: () => setActiveTab('list') },
                        { ...LIST_TABS[1], active: activeTab === 'board', onClick: () => setActiveTab('board') }
                    ]}
                />

                <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-5 py-2">
                    <button type="button" className="flex cursor-pointer items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-container-high)] px-3 py-1.5 text-caption font-bold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-highest)] hover:border-[var(--color-border)]"
                        onClick={() => setIsCreateTaskOpen(true)}
                    >
                        <Plus size={14} /> {t('addTask')} <ChevronDown size={12} />
                    </button>
                </div>

                <main className="flex flex-1 flex-col overflow-hidden">
                    {activeTab === 'list' ?
                        <ListView />
                        :
                        <BoardView showClosed={true} />
                    }
                </main>

                <ContextMenu
                    x={ctxMenu?.x || 0} y={ctxMenu?.y || 0}
                    isOpen={!!ctxMenu} onClose={() => setCtxMenu(null)}
                    onAction={onContextActionSelect} taskTitle={ctxMenu?.task.name}
                />

                <CreateTaskModal
                    isOpen={isCreateTaskOpen}
                    onClose={() => setIsCreateTaskOpen(false)}
                    onCreate={handleCreateTask}
                    groups={groups.map(g => ({ id: g.id, name: g.name, color: g.color }))}
                    lists={[]}
                    defaultListId={0}
                />
            </div>
        </TaskViewContext.Provider>
    );
}
