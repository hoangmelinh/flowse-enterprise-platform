import React, { useState, createContext, useContext, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Plus, ListTodo,
} from 'lucide-react';

import { useSpaceTree } from '../../layouts/AppLayout/SpaceTreeContext';
import PageHeader, { LIST_TABS } from '../../components/PageHeader/PageHeader';
import ContextMenu from '../../components/ContextMenu/ContextMenu';
import CreateTaskModal from '../../components/Modal/CreateTaskModal';
import BoardView from './components/BoardView';
import ListView from './components/ListView';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/configureStore';
import { fetchTasksForList, fetchCreateTask, fetchUpdateTask, fetchDeleteTask, fetchAddAssignee, fetchRemoveAssignee } from '@/store/modules/tasks';
import { fetchCreateStatus } from '@/store/modules/statuses';
import type { Task, StatusGroup, NewTaskData, Assignee, TaskViewContextType } from '@/types/tasks';
// eslint-disable-next-line react-refresh/only-export-components
export const TaskViewContext = createContext<TaskViewContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useTaskView = () => {
    const context = useContext(TaskViewContext);
    if (!context) throw new Error('useTaskView must be used within TaskViewProvider');
    return context;
};

export default function ListViewPage() {
    const { listId, spaceId } = useParams<{ listId: string; spaceId: string }>();
    const { spaces, spaceTree } = useSpaceTree();
    const dispatch = useDispatch<AppDispatch>();
    const listTasks = useSelector((state: RootState) => state.tasks.listTask);
    const [groups, setGroups] = useState<StatusGroup[]>([]);
    const [, setSelectedTask] = useState<Task | null>(null);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; task: Task } | null>(null);
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [showClosed] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'board'>('list');

    const columns = { assignee: true, dueDate: true, priority: true };

    let parentSpace: { id: string; name: string; color: string } | null = null;
    let parentFolder: { id: string; name: string } | null = null;
    let listInfo: { id: string; name: string } | null = null;

    for (const space of spaces) {
        const node = spaceTree[space.id];
        if (!node) continue;
        const standalone = node.standaloneLists.find(l => l.id === listId);
        if (standalone) { parentSpace = space; listInfo = standalone; break; }
        for (const folder of node.folders) {
            const found = folder.lists.find(l => l.id === listId);
            if (found) { parentSpace = space; parentFolder = folder; listInfo = found; break; }
        }
        if (listInfo) break;
    }

    const updateTask = useCallback((taskId: number, updates: Partial<Task>) => {
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

        if (updates.assignees !== undefined) {
            const currentTask = groups.flatMap(g => g.tasks).find(t => t.task_id === taskId);
            const prevIds = (currentTask?.assignees || []).map(a => String(a.user_id));
            const nextIds = updates.assignees.map(a => String(a.user_id));
            const toAdd = nextIds.filter(id => !prevIds.includes(id));
            const toRemove = prevIds.filter(id => !nextIds.includes(id));
            toAdd.forEach(userId => dispatch(fetchAddAssignee({ task_id: taskId, userId })));
            toRemove.forEach(userId => dispatch(fetchRemoveAssignee({ task_id: taskId, userId })));
        }

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
            list_id: Number(listId),
            status_id: groupId,
            priority: extras?.priority_name || 'Normal',
            due_date: extras?.due_date || null,
            assignee_ids: extras?.assignees?.map((a: Assignee) => a.user_id) || []
        };


        const tempId = Math.floor(Math.random() * 100000);
        const newTask: Task = {
            task_id: tempId,
            parent_task_id: null,
            list_id: Number(listId),
            space_id: Number(spaceId) || 0,
            folder_id: parentFolder ? Number(parentFolder.id) : null,
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
    }, [listId, spaceId, parentFolder, groups, dispatch]);

    const handleCreateTask = useCallback((payload: NewTaskData) => {

        dispatch(fetchCreateTask({
            list_id: payload.list_id,
            taskData: payload
        }));

        setIsCreateTaskOpen(false);

    }, [dispatch]);
    const handleCreateStatus = useCallback(async (name: string, color: string) => {
        if (!spaceId) return;
        try {
            const result = await dispatch(fetchCreateStatus({
                spaceId: Number(spaceId),
                statusName: name,
                color,
                position: groups.length,
            })).unwrap();
            setGroups(prev => [...prev, {
                id: result.status_id,
                name: result.status_name,
                color: result.color ?? '#9ca3af',
                isExpanded: true,
                tasks: [],
            }]);
        } catch (err) {
            console.error('Create Status error:', err);
        }
    }, [spaceId, groups.length, dispatch]);

    const onTaskContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY, task });
    };

    const onContextActionSelect = (action: string) => {
        if (!ctxMenu) return;
        if (action === 'delete') {
            // Optimistic UI update
            setGroups(prev => prev.map(g => ({ ...g, tasks: g.tasks.filter(t => t.task_id !== ctxMenu.task.task_id) })));
            // Call API to delete
            dispatch(fetchDeleteTask(ctxMenu.task.task_id));
        }
        setCtxMenu(null);
    };

    useEffect(() => {
        dispatch(fetchTasksForList(Number(listId)));
    }, [dispatch, listId]);


    useEffect(() => {
        if (listTasks.length > 0) {
            setGroups(listTasks);
        } else {
            setGroups([]);
        }
    }, [listTasks]);

    if (!parentSpace || !listInfo) {
        return <div className="flex h-full items-center justify-center text-[var(--color-text-secondary)]"><p>List not found</p></div>;
    }

    const contextValue: TaskViewContextType = {
        groups, setGroups,
        listId: Number(listId),
        showClosed, columns,
        setSelectedTask, onContextMenu: onTaskContextMenu,
        updateTask, handleInlineCreate, handleCreateStatus
    };

    return (
        <TaskViewContext.Provider value={contextValue}>
            <div className="flex h-full flex-col overflow-hidden bg-[var(--color-surface-container-lowest)]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

                <PageHeader
                    parentSpace={parentSpace}
                    parentFolder={parentFolder}
                    entityIcon={<ListTodo size={16} />}
                    entityName={listInfo.name}
                    tabs={[
                        { ...LIST_TABS[0], active: activeTab === 'list', onClick: () => setActiveTab('list') },
                        { ...LIST_TABS[1], active: activeTab === 'board', onClick: () => setActiveTab('board') }
                    ]}
                />

                <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-5 py-2">
                    <div className="flex items-center gap-1.5">
                        <button type="button" className="flex cursor-pointer items-center gap-1 rounded-md border-none bg-[var(--color-inverse-surface)] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-black"
                            onClick={() => setIsCreateTaskOpen(true)}
                        >
                            <Plus size={14} /> Add Task
                        </button>
                    </div>
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

                    lists={[{ id: Number(listInfo.id), name: listInfo.name }]}
                    defaultListId={Number(listInfo.id)}
                />
            </div>
        </TaskViewContext.Provider>
    );
}
