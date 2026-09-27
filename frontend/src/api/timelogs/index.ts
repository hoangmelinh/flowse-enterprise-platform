import { beApi } from '../callApi';
import type { TimeLogData } from '@/store/modules/timelogs';

export const getMyTimeLogs = async (): Promise<TimeLogData[]> => {
    return beApi.get(`/timelogs/me`);
};

export const getRunningTimer = async (): Promise<TimeLogData | null> => {
    return beApi.get(`/timelogs/running`);
};

export const getTimeLogsByTask = async (taskId: number): Promise<TimeLogData[]> => {
    return beApi.get(`/timelogs/tasks/${taskId}`);
};

export const getTotalTimeByTask = async (taskId: number): Promise<{ total_seconds: number }> => {
    return beApi.get(`/timelogs/tasks/${taskId}/total`);
};

export const startTimer = async (taskId: number, note?: string): Promise<TimeLogData> => {
    return beApi.post(`/timelogs/tasks/${taskId}/start`, { note });
};

export const stopTimer = async (timeLogId: number): Promise<TimeLogData> => {
    return beApi.put(`/timelogs/${timeLogId}/stop`);
};

export const deleteTimeLog = async (timeLogId: number): Promise<void> => {
    return beApi.delete(`/timelogs/${timeLogId}`);
};
