import type { TaskData, TaskWithSpaceData, TaskAttachment } from "@/store/modules/tasks";
import { beApi } from "../callApi";
import type { StatusGroup, Task } from "@/types/tasks";
export type { TaskData, TaskWithSpaceData, TaskAttachment };
import type { CreateTaskData } from "@/store/modules/tasks";


export const getTasksByListIds = async (list_ids: number): Promise<StatusGroup[]> => {
    return beApi.get(`/tasks/lists/${list_ids}`);
};
export const getTasksBySprintId = async (spaceId: number, sprintId: number): Promise<StatusGroup[]> => {
    return beApi.get(`/tasks/spaces/${spaceId}/sprints/${sprintId}`);
};
export const getTasksByUserId = async (): Promise<StatusGroup[]> => {
    return beApi.get(`/tasks/my-tasks`);
}

export const createTaskInList = async (taskData: CreateTaskData): Promise<Task> => {
    return beApi.post(`/tasks/lists/${taskData.list_id}`, taskData);
};

export const getTaskById = async (task_id: number): Promise<TaskWithSpaceData> => {
    return beApi.get(`/tasks/${task_id}`);
};

// NOTE: createTask for space-level (POST /tasks/spaces/:spaceId) was removed
// because it duplicated createTaskInList. Tasks should always be created via a list.


export const updateTask = async (
    task_id: number,
    updates: Partial<TaskData>
): Promise<TaskData> => {
    return beApi.put(`/tasks/${task_id}`, updates);
};

export const deleteTask = async (task_id: number): Promise<void> => {
    return beApi.delete(`/tasks/${task_id}`);
};


export const getAttachmentsByTask = async (task_id: number): Promise<TaskAttachment[]> => {
    return beApi.get(`/tasks/${task_id}/attachments`);
};

export const createAttachment = async (
    task_id: number,
    file_name: string,
    file_url: string,
    file_size?: number,
    mime_type?: string
): Promise<TaskAttachment> => {
    return beApi.post(`/tasks/${task_id}/attachments`, { file_name, file_url, file_size, mime_type });
};

export const deleteAttachment = async (attachment_id: number): Promise<void> => {
    return beApi.delete(`/tasks/attachments/${attachment_id}`);
};


export const addAssignee = async (task_id: number, userId: string): Promise<void> => {
    return beApi.post(`/tasks/${task_id}/assignees`, { userId });
};

export const removeAssignee = async (task_id: number, userId: string): Promise<void> => {
    return beApi.delete(`/tasks/${task_id}/assignees/${userId}`);
};

export interface ShareableUser {
    user_id: number;
    username: string;
    name: string;
    email: string;
    avatar_url: string | null;
}

export const getShareableUsers = async (task_id: number): Promise<ShareableUser[]> => {
    return beApi.get(`/tasks/${task_id}/shareable-users`);
};

export const shareTask = async (task_id: number, user_ids: number[]): Promise<{ message: string; assignees: ShareableUser[] }> => {
    return beApi.post(`/tasks/${task_id}/share`, { user_ids });
};

