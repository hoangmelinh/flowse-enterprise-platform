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
