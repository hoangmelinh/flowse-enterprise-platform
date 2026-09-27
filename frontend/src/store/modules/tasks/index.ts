import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
    getTasksByListIds,
    getTasksBySprintId,
    createTaskInList,
    updateTask,
    deleteTask,
    getAttachmentsByTask,
    createAttachment,
    deleteAttachment,
    addAssignee,
    removeAssignee,
    getTasksByUserId,
    getShareableUsers,
    shareTask,
} from "@/api/tasks";
import type { ShareableUser } from "@/api/tasks";
import type { StatusGroup, Task } from "@/types/tasks";

export interface CreateTaskData {
    list_id: number;
    name: string;
    description?: string | null;
    status_id?: number;
    
    priority?: string; 
    
    due_date?: string | null;
    assignee_ids?: number[];
}

export interface TaskData {
    task_id: number;
    parent_task_id: number | null;
    space_id: number;
    sprint_id: number | null;
    milestone_id: number | null;
    status_id: number | null;
    
    priority?: string; 
    
    name: string;
    description: string | null;
    story_points: number | null;
    start_date: string | null;
    due_date: string | null;
    completed_at: string | null;
    position: number;
    is_archived: boolean;
    created_by: number | null;
    created_at: string;
    updated_by: number | null;
    updated_at: string;
    deleted_at: string | null;
}

export interface TaskAssignee {
    user_id: number;
    name: string;
    avatar_url: string | null;
}

export interface TaskAttachment {
    attachment_id: number;
    task_id: number;
    url: string;
    file_url: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    description: string | null;
    created_at: string;
}

export interface TaskWithSpaceData extends TaskData {
    task_id: number; 
    
    space_name?: string;
    space_color?: string;
    space_deleted_at?: string | null;

    status_name?: string | null;
    status_color?: string | null;

    priority_name?: string | null;
    priority_color?: string | null;

    assignees?: TaskAssignee[]; 
    
    subtask_count?: number;
    comment_count?: number;
}

export interface TasksState {
    listTask: StatusGroup[];
    isLoadingTasks: boolean;
    errorTasks: string | null;

    selectedTask: TaskWithSpaceData | null;
    isLoadingTaskDetail: boolean;
    errorTaskDetail: string | null;

    attachments: TaskAttachment[];
    isLoadingAttachments: boolean;
    errorAttachments: string | null;
    isCreatingAttachment: boolean;
    errorCreateAttachment: string | null;
    isDeletingAttachment: boolean;
    errorDeleteAttachment: string | null;

    isCreatingTask: boolean;
    errorCreateTask: string | null;
    isUpdatingTask: boolean;
    errorUpdateTask: string | null;
    isDeletingTask: boolean;
    errorDeleteTask: string | null;

    isAddingAssignee: boolean;
    errorAddAssignee: string | null;
    isRemovingAssignee: boolean;
    errorRemoveAssignee: string | null;

    listTaskByUserId: StatusGroup[];
    isTasksByUserIdLoading: boolean;
    errorTasksByUserId: string | null;

    shareableUsers: ShareableUser[];
    isLoadingShareableUsers: boolean;
    errorShareableUsers: string | null;
    isSharingTask: boolean;
    errorShareTask: string | null;
    shareTaskSuccess: boolean;
}


export const fetchTasksForList = createAsyncThunk<StatusGroup[], number>(
    'tasks/fetchTasksForList',
    async (list_id, { rejectWithValue }) => {
        try {
            const response = await getTasksByListIds(list_id);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch tasks for list');
        }
    }
);

export const fetchTasksForSprint = createAsyncThunk<StatusGroup[], { spaceId: number; sprintId: number }>(
    'tasks/fetchTasksForSprint',
    async ({ spaceId, sprintId }, { rejectWithValue }) => {
        try {
            const response = await getTasksBySprintId(spaceId, sprintId);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch tasks for sprint');
        }
    }
);
export const fetchTasksForUser = createAsyncThunk<StatusGroup[], void>(
    'tasks/fetchTasksForUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await getTasksByUserId();
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch tasks for user');
        }
    }
);
export const fetchCreateTask = createAsyncThunk<
    TaskWithSpaceData,
    { list_id: number; taskData: CreateTaskData }
>(
    'tasks/createTask',
    async ({ list_id, taskData }, { rejectWithValue }) => {
        try {
            const response = await createTaskInList({
                list_id,
                name: taskData.name || 'Untitled Task', 
                description: taskData.description,
                status_id: taskData.status_id,                
                priority: taskData.priority, 
                due_date: taskData.due_date,
                assignee_ids: taskData.assignee_ids
            });
            
            return response as unknown as TaskWithSpaceData;
        } catch (error: unknown) { 
            return rejectWithValue(
                (error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ||
                (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                'Failed to create task'
            );
        }
    }
);

export const fetchUpdateTask = createAsyncThunk<
    TaskData,
    { task_id: number; updates: Partial<TaskData>; frontendUpdates?: Partial<Task> }
>(
    'tasks/updateTask',
    async ({ task_id, updates }, { rejectWithValue }) => {
        try {
            const response = await updateTask(task_id, updates);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update task');
        }
    }
);

export const fetchDeleteTask = createAsyncThunk<number, number>(
    'tasks/deleteTask',
    async (task_id, { rejectWithValue }) => {
        try {
            await deleteTask(task_id);
            return task_id;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete task');
        }
    }
);



// ─────────────────────────────────────────────
// Async Thunks — Attachments
// ─────────────────────────────────────────────

export const fetchAttachmentsByTask = createAsyncThunk<TaskAttachment[], number>(
    'tasks/fetchAttachmentsByTask',
    async (task_id, { rejectWithValue }) => {
        try {
            const response = await getAttachmentsByTask(task_id);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch attachments');
        }
    }
);

export const fetchCreateAttachment = createAsyncThunk<
    TaskAttachment,
    { task_id: number; file_name: string; file_url: string; file_size?: number; mime_type?: string }
>(
    'tasks/createAttachment',
    async ({ task_id, file_name, file_url, file_size, mime_type }, { rejectWithValue }) => {
        try {
            const response = await createAttachment(task_id, file_name, file_url, file_size, mime_type);
            return response;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to create attachment');
        }
    }
);

export const fetchDeleteAttachment = createAsyncThunk<number, number>(
    'tasks/deleteAttachment',
    async (attachment_id, { rejectWithValue }) => {
        try {
            await deleteAttachment(attachment_id);
            return attachment_id;
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to delete attachment');
        }
    }
);

// ─────────────────────────────────────────────
// Async Thunks — Assignees
// ─────────────────────────────────────────────

export const fetchAddAssignee = createAsyncThunk<
    { task_id: number; userId: string },
    { task_id: number; userId: string }
>(
    'tasks/addAssignee',
    async ({ task_id, userId }, { rejectWithValue }) => {
        try {
            await addAssignee(task_id, userId);
            return { task_id, userId };
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to add assignee');
        }
    }
);

export const fetchRemoveAssignee = createAsyncThunk<
    { task_id: number; userId: string },
    { task_id: number; userId: string }
>(
    'tasks/removeAssignee',
    async ({ task_id, userId }, { rejectWithValue }) => {
        try {
            await removeAssignee(task_id, userId);
            return { task_id, userId };
        } catch (error: unknown) { 
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to remove assignee');
        }
    }
);

export const fetchShareableUsers = createAsyncThunk<ShareableUser[], number>(
    'tasks/fetchShareableUsers',
    async (task_id, { rejectWithValue }) => {
        try {
            const response = await getShareableUsers(task_id);
            return response;
        } catch (error: unknown) {
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch shareable users');
        }
    }
);

export const fetchShareTask = createAsyncThunk<
    { message: string; assignees: ShareableUser[] },
    { task_id: number; user_ids: number[] }
>(
    'tasks/shareTask',
    async ({ task_id, user_ids }, { rejectWithValue }) => {
        try {
            const response = await shareTask(task_id, user_ids);
            return response;
        } catch (error: unknown) {
            return rejectWithValue((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to share task');
        }
    }
);

// ─────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────

const initialState: TasksState = {
    listTask: [],
    isLoadingTasks: false,
    errorTasks: null,

    selectedTask: null,
    isLoadingTaskDetail: false,
    errorTaskDetail: null,

    attachments: [],
    isLoadingAttachments: false,
    errorAttachments: null,
    isCreatingAttachment: false,
    errorCreateAttachment: null,
    isDeletingAttachment: false,
    errorDeleteAttachment: null,

    isCreatingTask: false,
    errorCreateTask: null,
    isUpdatingTask: false,
    errorUpdateTask: null,
    isDeletingTask: false,
    errorDeleteTask: null,

    isAddingAssignee: false,
    errorAddAssignee: null,
    isRemovingAssignee: false,
    errorRemoveAssignee: null,

    listTaskByUserId: [],
    isTasksByUserIdLoading: false,
    errorTasksByUserId: null,

    shareableUsers: [],
    isLoadingShareableUsers: false,
    errorShareableUsers: null,
    isSharingTask: false,
    errorShareTask: null,
    shareTaskSuccess: false,
};

export const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        clearSelectedTask(state) {
            state.selectedTask = null;
            state.attachments = [];
        },
        clearTasksError(state) {
            state.errorTasks = null;
            state.errorCreateTask = null;
            state.errorUpdateTask = null;
            state.errorDeleteTask = null;
            state.errorShareTask = null;
        },
        clearShareTaskState(state) {
            state.shareableUsers = [];
            state.isLoadingShareableUsers = false;
            state.errorShareableUsers = null;
            state.isSharingTask = false;
            state.errorShareTask = null;
            state.shareTaskSuccess = false;
        },
        setSelectedTask(state, action: PayloadAction<TaskWithSpaceData | null>) {
            state.selectedTask = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchTasksForList.pending, (state) => {
            state.isLoadingTasks = true;
            state.errorTasks = null;
        });
        builder.addCase(fetchTasksForList.fulfilled, (state, action) => {
            state.isLoadingTasks = false;
            state.listTask = action.payload;
        });
        builder.addCase(fetchTasksForList.rejected, (state, action) => {
            state.isLoadingTasks = false;
            state.errorTasks = action.payload as string;
        });

        builder.addCase(fetchTasksForSprint.pending, (state) => {
            state.isLoadingTasks = true;
            state.errorTasks = null;
        });
        builder.addCase(fetchTasksForSprint.fulfilled, (state, action) => {
            state.isLoadingTasks = false;
            state.listTask = action.payload;
        });
        builder.addCase(fetchTasksForSprint.rejected, (state, action) => {
            state.isLoadingTasks = false;
            state.errorTasks = action.payload as string;
        });

        builder.addCase(fetchCreateTask.pending, (state) => {
            state.isCreatingTask = true;
            state.errorCreateTask = null;
        });
        builder.addCase(fetchCreateTask.fulfilled, (state, action) => {
            state.isCreatingTask = false;
            
            const raw = action.payload;

            // Build a properly typed Task from the API response
            const newTask: Task = {
                task_id: raw.task_id,
                parent_task_id: raw.parent_task_id,
                list_id: (raw as TaskWithSpaceData & { list_id?: number; folder_id?: number; subtask_done_count?: number; attachment_count?: number }).list_id ?? null,
                space_id: raw.space_id,
                folder_id: (raw as TaskWithSpaceData & { folder_id?: number }).folder_id ?? null,
                name: raw.name,
                description: raw.description,
                status_id: raw.status_id ?? null,
                status_name: raw.status_name ?? null,
                status_color: raw.status_color ?? null,
                priority_name: raw.priority_name ?? raw.priority ?? 'Normal',
                priority_color: raw.priority_color ?? null,
                due_date: raw.due_date,
                position: raw.position,
                subtask_count: raw.subtask_count ?? 0,
                subtask_done_count: (raw as TaskWithSpaceData & { subtask_done_count?: number }).subtask_done_count ?? 0,
                comment_count: raw.comment_count ?? 0,
                attachment_count: (raw as TaskWithSpaceData & { attachment_count?: number }).attachment_count ?? 0,
                assignees: raw.assignees || [],
            };
            
            const statusGroup = state.listTask.find(group => (group.id) == (newTask.status_id));
            if (statusGroup) {
                newTask.status_name = statusGroup.name;
                newTask.status_color = statusGroup.color;
                
                const pColors: Record<string, string> = {
                    'Urgent': '#ef4444', 
                    'High': '#f59e0b', 
                    'Normal': '#3b82f6', 
                    'Low': '#8b5cf6', 
                    'Clear': '#9ca3af'
                };
                newTask.priority_color = pColors[newTask.priority_name || 'Normal'] || 'transparent';

                statusGroup.tasks.unshift(newTask);
            } else {
                state.listTask.push({
                    id: Number(newTask.status_id) || 0,
                    name: newTask.status_name || 'No Status',
                    color: newTask.status_color || '#000000',
                    isExpanded: true,
                    tasks: [newTask],
                });
            }
        });
        builder.addCase(fetchCreateTask.rejected, (state, action) => {
            state.isCreatingTask = false;
            state.errorCreateTask = action.payload as string;
        });
        builder.addCase(fetchTasksForUser.pending, (state) => {
            state.isTasksByUserIdLoading = true;
            state.errorTasksByUserId = null;
        });
        builder.addCase(fetchTasksForUser.fulfilled, (state, action) => {
            state.isTasksByUserIdLoading = false;
            state.listTaskByUserId = action.payload;
        });
        builder.addCase(fetchTasksForUser.rejected, (state, action) => {
            state.isTasksByUserIdLoading = false;
            state.errorTasksByUserId = action.payload as string;
        });

        // ── Update Task ──
        builder.addCase(fetchUpdateTask.pending, (state) => {
            state.isUpdatingTask = true;
            state.errorUpdateTask = null;
        });
        builder.addCase(fetchUpdateTask.fulfilled, (state, action) => {
            state.isUpdatingTask = false;
            const updatedTask = action.payload;
            const frontendUpdates = action.meta.arg.frontendUpdates;

            // Dùng status_id từ API response (nguồn sự thật)
            const newStatusId = updatedTask.status_id;

            // Tra cứu status_name/color từ group tương ứng trong store
            const targetGroup = newStatusId != null
                ? state.listTask.find(g => g.id === newStatusId)
                : null;

            const safeFields = {
                name: updatedTask.name,
                description: updatedTask.description,
                due_date: updatedTask.due_date,
                status_id: newStatusId,
                position: updatedTask.position,
                updated_at: updatedTask.updated_at,
                // Enrich status UI fields từ group lookup
                ...(targetGroup && { status_name: targetGroup.name, status_color: targetGroup.color }),
                // Giữ các UI field từ frontendUpdates
                ...(frontendUpdates?.priority_name !== undefined && { priority_name: frontendUpdates.priority_name }),
                ...(frontendUpdates?.priority_color !== undefined && { priority_color: frontendUpdates.priority_color }),
                ...(frontendUpdates?.assignees !== undefined && { assignees: frontendUpdates.assignees }),
                ...(frontendUpdates?.due_date !== undefined && { due_date: frontendUpdates.due_date }),
            };

            // Tìm task trong group hiện tại và tách ra
            let movedTask: Task | null = null;
            let fromGroupId: number | null = null;

            for (const group of state.listTask) {
                const idx = group.tasks.findIndex(t => t.task_id === updatedTask.task_id);
                if (idx !== -1) {
                    movedTask = { ...group.tasks[idx], ...safeFields };
                    fromGroupId = group.id;
                    group.tasks.splice(idx, 1);
                    break;
                }
            }

            if (movedTask) {
                // Đặt task vào đúng group (group mới nếu status thay đổi, group cũ nếu không)
                const destGroupId = newStatusId ?? fromGroupId;
                const destGroup = state.listTask.find(g => g.id === destGroupId);
                if (destGroup) {
                    destGroup.tasks.push(movedTask);
                } else if (fromGroupId !== null) {
                    // Fallback: đặt lại về group cũ nếu không tìm thấy group mới
                    const origGroup = state.listTask.find(g => g.id === fromGroupId);
                    if (origGroup) origGroup.tasks.push(movedTask);
                }
            }

            if (state.selectedTask && state.selectedTask.task_id === updatedTask.task_id) {
                state.selectedTask = { ...state.selectedTask, ...safeFields };
            }
        });
        builder.addCase(fetchUpdateTask.rejected, (state, action) => {
            state.isUpdatingTask = false;
            state.errorUpdateTask = action.payload as string;
        });

        // ── Delete Task ──
        builder.addCase(fetchDeleteTask.pending, (state) => {
            state.isDeletingTask = true;
            state.errorDeleteTask = null;
        });
        builder.addCase(fetchDeleteTask.fulfilled, (state, action) => {
            state.isDeletingTask = false;
            const deletedTaskId = action.payload;
            // Remove task from all groups
            for (const group of state.listTask) {
                group.tasks = group.tasks.filter(t => t.task_id !== deletedTaskId);
            }
            // Clear selectedTask if deleted
            if (state.selectedTask && state.selectedTask.task_id === deletedTaskId) {
                state.selectedTask = null;
            }
        });
        builder.addCase(fetchDeleteTask.rejected, (state, action) => {
            state.isDeletingTask = false;
            state.errorDeleteTask = action.payload as string;
        });



        // ── Attachments ──
        builder.addCase(fetchAttachmentsByTask.pending, (state) => {
            state.isLoadingAttachments = true;
            state.errorAttachments = null;
        });
        builder.addCase(fetchAttachmentsByTask.fulfilled, (state, action) => {
            state.isLoadingAttachments = false;
            state.attachments = action.payload;
        });
        builder.addCase(fetchAttachmentsByTask.rejected, (state, action) => {
            state.isLoadingAttachments = false;
            state.errorAttachments = action.payload as string;
        });

        builder.addCase(fetchCreateAttachment.pending, (state) => {
            state.isCreatingAttachment = true;
            state.errorCreateAttachment = null;
        });
        builder.addCase(fetchCreateAttachment.fulfilled, (state, action) => {
            state.isCreatingAttachment = false;
            state.attachments.push(action.payload);
        });
        builder.addCase(fetchCreateAttachment.rejected, (state, action) => {
            state.isCreatingAttachment = false;
            state.errorCreateAttachment = action.payload as string;
        });

        builder.addCase(fetchDeleteAttachment.pending, (state) => {
            state.isDeletingAttachment = true;
            state.errorDeleteAttachment = null;
        });
        builder.addCase(fetchDeleteAttachment.fulfilled, (state, action) => {
            state.isDeletingAttachment = false;
            state.attachments = state.attachments.filter(a => a.attachment_id !== action.payload);
        });
        builder.addCase(fetchDeleteAttachment.rejected, (state, action) => {
            state.isDeletingAttachment = false;
            state.errorDeleteAttachment = action.payload as string;
        });

        // ── Assignees ──
        builder.addCase(fetchAddAssignee.pending, (state) => {
            state.isAddingAssignee = true;
            state.errorAddAssignee = null;
        });
        builder.addCase(fetchAddAssignee.fulfilled, (state) => {
            state.isAddingAssignee = false;
        });
        builder.addCase(fetchAddAssignee.rejected, (state, action) => {
            state.isAddingAssignee = false;
            state.errorAddAssignee = action.payload as string;
        });

        builder.addCase(fetchRemoveAssignee.pending, (state) => {
            state.isRemovingAssignee = true;
            state.errorRemoveAssignee = null;
        });
        builder.addCase(fetchRemoveAssignee.fulfilled, (state) => {
            state.isRemovingAssignee = false;
        });
        builder.addCase(fetchRemoveAssignee.rejected, (state, action) => {
            state.isRemovingAssignee = false;
            state.errorRemoveAssignee = action.payload as string;
        });

        // ── Shareable Users ──
        builder.addCase(fetchShareableUsers.pending, (state) => {
            state.isLoadingShareableUsers = true;
            state.errorShareableUsers = null;
        });
        builder.addCase(fetchShareableUsers.fulfilled, (state, action) => {
            state.isLoadingShareableUsers = false;
            state.shareableUsers = action.payload;
        });
        builder.addCase(fetchShareableUsers.rejected, (state, action) => {
            state.isLoadingShareableUsers = false;
            state.errorShareableUsers = action.payload as string;
        });

        // ── Share Task ──
        builder.addCase(fetchShareTask.pending, (state) => {
            state.isSharingTask = true;
            state.errorShareTask = null;
            state.shareTaskSuccess = false;
        });
        builder.addCase(fetchShareTask.fulfilled, (state) => {
            state.isSharingTask = false;
            state.shareTaskSuccess = true;
        });
        builder.addCase(fetchShareTask.rejected, (state, action) => {
            state.isSharingTask = false;
            state.errorShareTask = action.payload as string;
        });
    },
});

export const { clearSelectedTask, clearTasksError, setSelectedTask, clearShareTaskState } = tasksSlice.actions;

export default tasksSlice.reducer;