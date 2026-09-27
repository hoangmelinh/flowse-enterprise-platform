import {
    findAllTasksByListId,
    findAllTasksBySprintId,
    createTask,
    createTaskForList,
    findTaskById,
    updateTask,
    deleteTask,
    createComment,
    getCommentsByTaskId,
    updateComment,
    deleteComment,
    createAttachment,
    getAttachmentsByTaskId,
    deleteAttachment,
    assignUserToTask,
    unassignUserFromTask,
    getAssignedUsersByTaskId,
    findAllTasksByUserId,
    shareTaskToUsers,
    getShareableUsers,
} from '../models/Task.js';
import { findStatusById, findStatusesByListId, findStatusesBySprintId } from '../models/TaskStatus.js';
import { createActivity } from '../models/ActivityLogs.js';
import { createAssignNotificationIfNotExists } from '../models/Notifications.js';

// Mapping: field name → activity action type
const FIELD_TO_ACTION = {
    status_id:    'status_changed',
    priority:     'priority_changed',
    due_date:     'due_date_changed',
    start_date:   'start_date_changed',
    name:         'updated',
    description:  'updated',
    story_points: 'story_points_changed',
    sprint_id:    'sprint_assigned',
    is_archived:  'archived',
};

const formatTaskForBoard = (task) => ({
    ...task,
    assignees: task.assignees || [],
    subtask_count: 0,
    subtask_done_count: 0,
    comment_count: Number(task.comment_count) || 0,
    attachment_count: Number(task.attachment_count) || 0,
});

const groupTasksByStatus = (statuses, rawTasks) => {
    const groupedTaskIds = new Set();

    const groupedData = statuses.map((status) => {
        const tasksInStatus = rawTasks
            .filter(task => Number(task.status_id) === Number(status.status_id))
            .map(task => {
                groupedTaskIds.add(task.task_id);
                return formatTaskForBoard(task);
            });

        return {
            id: status.status_id,
            name: status.status_name,
            color: status.color || '#d3d3d3',
            isExpanded: true,
            tasks: tasksInStatus
        };
    });

    const orphanedTasks = rawTasks
        .filter(task => !groupedTaskIds.has(task.task_id))
        .map(formatTaskForBoard);

    if (orphanedTasks.length > 0) {
        groupedData.push({
            id: 0,
            name: 'No Status',
            color: '#9ca3af',
            isExpanded: true,
            tasks: orphanedTasks
        });
    }

    return groupedData;
};

const getSafeAttachmentUrl = (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();

    if (trimmed.startsWith('/uploads/')) return trimmed;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:') return null;
        return parsed.toString();
    } catch {
        return null;
    }
};

const getSafeFileName = (value, fallback = 'attachment') => {
    const raw = typeof value === 'string' && value.trim() ? value.trim() : fallback;
    return raw.replace(/[\\/:*?"<>|]/g, '_').slice(0, 255);
};

export const getTasksByListId = async (req, res) => {
    try {
        const { listId } = req.params;

        if (!listId) {
            return res.status(400).json({ error: "List ID is required" });
        }

        const statuses = await findStatusesByListId(listId);
        const rawTasks = await findAllTasksByListId(listId);

        const groupedData = groupTasksByStatus(statuses, rawTasks);

        res.status(200).json(groupedData);

    } catch (error) {
        console.error("[getTasksByListId] Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const getTasksBySprintId = async (req, res) => {
    try {
        const { sprintId, spaceId } = req.params;

        if (!sprintId || !spaceId) {
            return res.status(400).json({ error: "Sprint ID and Space ID are required" });
        }

        const statuses = await findStatusesBySprintId(sprintId);
        const rawTasks = await findAllTasksBySprintId(sprintId);

        const groupedData = groupTasksByStatus(statuses, rawTasks);

        res.status(200).json(groupedData);

    } catch (error) {
        console.error("[getTasksBySprintId] Error:", error);
        res.status(500).json({ error: error.message });
    }
};
export const getTasksByUserId = async (req, res) => {
    try {
        const userId = req.user?.user_id;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const rawTasks = await findAllTasksByUserId(userId);

        const statusMap = new Map();
        const orphanedTasks = [];

        rawTasks.forEach((task) => {
            const formattedTask = {
                ...task,
                assignees: task.assignees || [],
                subtask_count: 0,
                subtask_done_count: 0,
                comment_count: Number(task.comment_count) || 0,
                attachment_count: Number(task.attachment_count) || 0,
            };
            if (task.status_id) {
                if (!statusMap.has(task.status_id)) {
                    statusMap.set(task.status_id, {
                        id: task.status_id,
                        name: task.status_name || `Status ${task.status_id}`,
                        color: task.color || '#d3d3d3',
                        isExpanded: true,
                        tasks: []
                    });
                }
                statusMap.get(task.status_id).tasks.push(formattedTask);
            } else {
                orphanedTasks.push(formattedTask);
            }
        });

        const groupedData = Array.from(statusMap.values());

        if (orphanedTasks.length > 0) {
            groupedData.push({
                id: 0,
                name: 'No Status',
                color: '#9ca3af',
                isExpanded: true,
                tasks: orphanedTasks
            });
        }

        res.status(200).json(groupedData);

    } catch (error) {
        console.error("[getTasksByUserId] Error:", error);
        res.status(500).json({ error: error.message });
    }
};

export const createTasks = async (req, res) => {
    try {
        const { spaceId } = req.params;
        const { name, description } = req.body;
        const created_by = req.user?.user_id || null;
        if (!spaceId) {
            return res.status(400).json({ error: "Space ID is required" });
        }
        if (!name || !description) {
            return res.status(400).json({ error: "Name and description are required" });
        }
        const due_date = req.body.due_date ? new Date(req.body.due_date) : null;
        const newTask = await createTask(name, description, spaceId, due_date, created_by);
        res.status(201).json(newTask);

    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};
export const createTasksForList = async (req, res) => {
    try {
        const { listId } = req.params;

        const { name, description, priority, assignee_ids, due_date, status_id } = req.body;

        if (!listId) return res.status(400).json({ error: "List ID is required" });
        if (!name) return res.status(400).json({ error: "Name is required" });

        const created_by = req.user?.user_id || null;

        const newTask = await createTaskForList({
            listId, name, description, priority, assignee_ids, due_date, status_id, created_by
        });

        res.status(201).json({
            ...newTask,
            assignees: [],
            comment_count: 0,
            subtask_count: 0
        });

    } catch (error) {
        console.error("Error creating task:", error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};
export const updateTasks = async (req, res) => {
    try {
        const { taskId } = req.params;
        const updateData = req.body;
        const userId = req.user?.user_id;

        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }

        // Lấy snapshot trước khi update để so sánh
        const oldTask = await findTaskById(taskId);

        const updatedTask = await updateTask(taskId, updateData);

        if (!updatedTask) {
            return res.status(400).json({ error: "Không có dữ liệu hợp lệ để cập nhật" });
        }

        // Ghi activity log cho từng field thay đổi (fire-and-forget)
        if (oldTask) {
            const loggedActions = new Set();

            for (const [field, action] of Object.entries(FIELD_TO_ACTION)) {
                if (!(field in updateData)) continue;

                const oldVal = oldTask[field];
                const newVal = updateData[field];

                // Chỉ log khi giá trị thực sự thay đổi
                if (String(oldVal) === String(newVal)) continue;

                // Với name/description gộp thành 1 'updated' log
                if (loggedActions.has(action)) continue;
                loggedActions.add(action);

                createActivity(
                    taskId,
                    userId,
                    action,
                    { [field]: oldVal },
                    { [field]: newVal }
                ).catch((err) => console.error('[activity log] updateTask error:', err));
            }
        }

        res.status(200).json(updatedTask);

    } catch (error) {
        console.error("Error updating task:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
};

export const deleteTasks = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }

        await deleteTask(taskId);

        res.status(200).json({ message: "Task deleted successfully" });

    } catch (error) {
        console.error("[deleteTasks] Error:", error);

        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        res.status(500).json({ error: error.message });
    }
};

export const getTaskById = async (req, res) => {
    try {
        const { taskId } = req.params;
        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        const task = await findTaskById(taskId);
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        res.status(200).json(task);

    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// subtasks controller removed

export const getCommentsByTaskIds = async (req, res) => {
    try {
        const { taskId } = req.params;
        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        const comments = await getCommentsByTaskId(taskId);
        res.status(200).json(comments);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

export const createComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;
        const userId = req.user?.user_id;
        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        if (!content) {
            return res.status(400).json({ error: "Comment content is required" });
        }
        // Model signature: createComment(content, task_id, user_id)
        const newComment = await createComment(content, taskId, userId);

        // Log 'commented' activity (fire-and-forget)
        createActivity(taskId, userId, 'commented', null, { content })
            .catch((err) => console.error('[activity log] commented error:', err));

        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAttachmentsByTaskIds = async (req, res) => {
    try {
        const { taskId } = req.params;
        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        const attachments = await getAttachmentsByTaskId(taskId);
        res.status(200).json(attachments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createAttachments = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { file_size, mime_type } = req.body;
        const rawFileUrl = req.body.file_url || req.body.url;
        const rawFileName = req.body.file_name || req.body.description || rawFileUrl;
        const file_url = getSafeAttachmentUrl(rawFileUrl);
        const file_name = getSafeFileName(rawFileName);
        const uploaded_by = req.user?.user_id;
        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        if (!file_url) {
            return res.status(400).json({ error: "A valid https file_url or /uploads/ path is required" });
        }
        // Model signature: createAttachment(task_id, file_name, file_url, file_size, mime_type, uploaded_by)
        const newAttachment = await createAttachment(
            taskId, file_name, file_url, file_size || null, mime_type || null, uploaded_by
        );
        res.status(201).json(newAttachment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteAttachments = async (req, res) => {
    try {
        const { attachmentId } = req.params;
        if (!attachmentId) {
            return res.status(400).json({ error: "Attachment ID is required" });
        }
        await deleteAttachment(attachmentId);
        res.status(200).json({ message: "Attachment deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const addAssigneeToTasks = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { userId } = req.body;
        const actorId = req.user?.user_id;
        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const task = await findTaskById(taskId);
        await assignUserToTask(taskId, userId);

        // Log 'assigned' activity (fire-and-forget)
        createActivity(taskId, actorId, 'assigned', null, { user_id: userId })
            .catch((err) => console.error('[activity log] assigned error:', err));

        // Tạo notification assign cho người được giao (fire-and-forget)
        if (Number(userId) !== Number(actorId)) {
            const taskName = task?.name || `Task #${taskId}`;
            const content = `Bạn đã được giao task "${taskName}".`;
            createAssignNotificationIfNotExists(userId, actorId, taskId, content)
                .catch((err) => console.error('[notification] assign error:', err));
        }

        res.status(200).json({ message: "Assignee added successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const removeAssigneeFromTasks = async (req, res) => {
    try {
        const { taskId, userId } = req.params;
        const actorId = req.user?.user_id;
        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }
        await unassignUserFromTask(taskId, userId);

        // Log 'unassigned' activity (fire-and-forget)
        createActivity(taskId, actorId, 'unassigned', { user_id: userId }, null)
            .catch((err) => console.error('[activity log] unassigned error:', err));

        res.status(200).json({ message: "Assignee removed successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const shareTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { user_ids } = req.body;
        const sharedBy = req.user?.user_id;

        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }
        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({ error: "user_ids is required and must be a non-empty array" });
        }

        const task = await findTaskById(taskId);
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        const results = await shareTaskToUsers(taskId, user_ids, sharedBy);

        // Log activity + tạo notification cho từng user được chia sẻ (fire-and-forget)
        const taskName = task?.name || `Task #${taskId}`;
        for (const result of results) {
            const userId = result.user_id;
            createActivity(taskId, sharedBy, 'assigned', null, { user_id: userId })
                .catch((err) => console.error('[activity log] share task error:', err));

            if (Number(userId) !== Number(sharedBy)) {
                const content = `Bạn đã được giao task "${taskName}".`;
                createAssignNotificationIfNotExists(userId, sharedBy, taskId, content)
                    .catch((err) => console.error('[notification] share task assign error:', err));
            }
        }

        res.status(200).json({
            message: "Task shared successfully",
            assignees: results
        });
    } catch (error) {
        console.error("[shareTask] Error:", error);
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

export const getShareableUsersForTask = async (req, res) => {
    try {
        const { taskId } = req.params;

        if (!taskId) {
            return res.status(400).json({ error: "Task ID is required" });
        }

        const task = await findTaskById(taskId);
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        const users = await getShareableUsers(taskId);
        res.status(200).json(users);
    } catch (error) {
        console.error("[getShareableUsersForTask] Error:", error);
        res.status(500).json({ error: error.message });
    }
};

