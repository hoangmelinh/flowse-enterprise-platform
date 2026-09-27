export interface AIChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    isStreaming?: boolean;
    isSearching?: boolean;
    followUps?: string[];
}

export interface ChatSession {
    id: string;
    title: string;
    messages: AIChatMessage[];
    timestamp: number;
}
