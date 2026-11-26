import { beApi } from '../callApi';
import type { AIChatMessage, ActionCardData, AIAnalyticsSummaryResponse } from '@/types/ai';

export interface ChatWithAIResponse {
    response: string;
    suggestions: string[];
    suggestedTitle?: string | null;
    actionCard?: ActionCardData;
}

export const chatWithAI = async (
    message: string,
    history: Pick<AIChatMessage, 'role' | 'content'>[],
): Promise<ChatWithAIResponse> => {
    return beApi.post('ai/chat', { message, history });
};

export const getAIAnalyticsSummary = async (
    period: string = 'month'
): Promise<{ success: boolean; data: AIAnalyticsSummaryResponse }> => {
    return beApi.post('ai/analytics-summary', { period });
};

export const draftAIAction = async (
    prompt: string,
    context?: Record<string, any>
): Promise<{ success: boolean; actionCard: ActionCardData }> => {
    return beApi.post('ai/draft-action', { prompt, context });
};

export const summarizeIncidentAI = async (
    incidentId: number
): Promise<{ success: boolean; summary: string; incident_id: number; asset_code?: string }> => {
    return beApi.post('ai/summarize-incident', { incident_id: incidentId });
};

export interface AiWorkAction {
    action_id: number;
    action_type: 'CREATE_TASK' | 'UPDATE_TASK' | 'ASSIGN_TASK' | 'DELETE_TASK';
    status: 'PENDING' | 'APPLYING' | 'APPLIED' | 'CANCELLED' | 'FAILED';
    summary: {
        title: string;
        detail?: string;
        space_name?: string;
        list_name?: string;
        assignees?: string[];
        priority?: string;
        due_date?: string;
    };
    result?: any;
    created_at: string;
    decided_at?: string | null;
}

export const workWithAI = async (
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<{ data: { response: string; action: AiWorkAction | null } }> => {
    return beApi.post('ai/work', { message, history });
};

export const listAiActions = async (): Promise<{ data: AiWorkAction[] }> => {
    return beApi.get('ai/actions');
};

export const applyAiAction = async (id: number): Promise<{ data: AiWorkAction }> => {
    return beApi.post(`ai/actions/${id}/apply`);
};

export const cancelAiAction = async (id: number): Promise<{ data: AiWorkAction }> => {
    return beApi.post(`ai/actions/${id}/cancel`);
};
