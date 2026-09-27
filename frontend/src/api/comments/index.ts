import { beApi } from '../callApi';
import type { CommentData } from '@/store/modules/comments';

export const getCommentsByTask = async (taskId: number): Promise<CommentData[]> => {
    return beApi.get(`/tasks/${taskId}/comments`);
};

export const createComment = async (
    taskId: number,
    content: string
): Promise<CommentData> => {
    return beApi.post(`/tasks/${taskId}/comments`, {
        taskId: taskId,
        content: content,
    });
};
