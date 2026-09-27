import { beApi } from '../callApi';
import type { SprintData } from '@/store/modules/sprints';

export const getSprintsBySpace = async (spaceId: number): Promise<SprintData[]> => {
    return beApi.get(`/sprints/spaces/${spaceId}/sprints`);
};

export const getSprintById = async (sprintId: number): Promise<SprintData> => {
    return beApi.get(`/sprints/${sprintId}`);
};

export const createSprint = async (
    spaceId: number,
    body: {
        name: string;
        description?: string;
        goal?: string;
        status?: 'planning' | 'active' | 'completed' | 'cancelled';
        startDate?: string;
        endDate?: string;
    },
): Promise<SprintData> => {
    return beApi.post(`/sprints/spaces/${spaceId}/sprints`, body);
};

export const updateSprint = async (
    sprintId: number,
    body: {
        name?: string;
        description?: string;
        goal?: string;
        status?: 'planning' | 'active' | 'completed' | 'cancelled';
        velocity?: number;
        startDate?: string;
        endDate?: string;
    },
): Promise<SprintData> => {
    return beApi.put(`/sprints/${sprintId}`, body);
};

export const deleteSprint = async (sprintId: number): Promise<void> => {
    return beApi.delete(`/sprints/${sprintId}`);
};
