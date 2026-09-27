import { beApi } from '../callApi';
import type { MilestoneData } from '@/store/modules/milestones';

export const getMilestonesBySpace = async (spaceId: number): Promise<MilestoneData[]> => {
    return beApi.get(`/milestones/spaces/${spaceId}/milestones`);
};

export const getMilestonesByList = async (listId: number): Promise<MilestoneData[]> => {
    return beApi.get(`/milestones/lists/${listId}/milestones`);
};

export const getMilestoneById = async (milestoneId: number): Promise<MilestoneData> => {
    return beApi.get(`/milestones/${milestoneId}`);
};

export const createMilestoneInList = async (
    listId: number,
    body: {
        name: string;
        description?: string | null;
        status?: 'on_track' | 'at_risk' | 'completed' | 'cancelled';
        color?: string;
        dueDate?: string | null;
    },
): Promise<MilestoneData> => {
    return beApi.post(`/milestones/lists/${listId}/milestones`, body);
};

export const updateMilestone = async (
    milestoneId: number,
    body: {
        name?: string;
        description?: string | null;
        status?: 'on_track' | 'at_risk' | 'completed' | 'cancelled';
        color?: string;
        dueDate?: string | null;
    },
): Promise<MilestoneData> => {
    return beApi.put(`/milestones/${milestoneId}`, body);
};

export const deleteMilestone = async (milestoneId: number): Promise<void> => {
    return beApi.delete(`/milestones/${milestoneId}`);
};
