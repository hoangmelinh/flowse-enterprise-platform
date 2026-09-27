import { beApi } from '../callApi';
import type { AIChatMessage } from '@/types/ai';

export interface ChatWithAIResponse {
    response: string;
    suggestions: string[];
    suggestedTitle?: string | null;
}

export const chatWithAI = async (
    message: string,
    history: Pick<AIChatMessage, 'role' | 'content'>[],
): Promise<ChatWithAIResponse> => {
    return beApi.post('ai/chat', { message, history });
};
