import { beApi } from '../callApi';
import type { ActivityLog } from '@/types/activityLogs';

export const getActivitiesByTask = async (
    taskId: number,
    limit = 50,
    offset = 0,
): Promise<ActivityLog[]> => {
    return beApi.get(`/activities/tasks/${taskId}`, {
        params: { limit, offset },
    });
};

export const getActivitiesBySpace = async (
    spaceId: number,
    limit = 10,
    offset = 0,
): Promise<ActivityLog[]> => {
    return beApi.get(`/activities/spaces/${spaceId}`, {
        params: { limit, offset },
    });
};
