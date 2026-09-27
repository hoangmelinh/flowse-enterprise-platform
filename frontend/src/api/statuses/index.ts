import { beApi } from '../callApi';
import type { StatusData } from '@/store/modules/statuses';

export const getStatusesBySpace = async (spaceId: number): Promise<StatusData[]> => {
    return beApi.get(`/statuses/spaces/${spaceId}`);
};

export const getStatusesByList = async (listId: number): Promise<StatusData[]> => {
    return beApi.get(`/statuses/lists/${listId}`);
};

export const getStatusById = async (statusId: number): Promise<StatusData> => {
    return beApi.get(`/statuses/${statusId}`);
};

export const createTaskStatus = async (
    spaceId: number,
    body: {
        statusName: string;
        color?: string;
        position?: number;
        isDoneState?: boolean;
        isDefault?: boolean;
    },
): Promise<StatusData> => {
    return beApi.post(`/statuses/spaces/${spaceId}`, body);
};

export const updateTaskStatus = async (
    statusId: number,
    body: {
        statusName?: string;
        color?: string;
        isDoneState?: boolean;
    },
): Promise<StatusData> => {
    return beApi.put(`/statuses/${statusId}`, body);
};

export const deleteTaskStatus = async (statusId: number): Promise<void> => {
    return beApi.delete(`/statuses/${statusId}`);
};

export const reorderStatus = async (statusId: number, position: number): Promise<StatusData> => {
    return beApi.put(`/statuses/${statusId}/reorder`, { position });
};
