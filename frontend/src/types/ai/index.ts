export interface ActionCardData {
    card_id: string;
    action_type: 'CREATE_INCIDENT' | 'CREATE_TASK' | 'REQUEST_PARTS' | 'ASSIGN_TECHNICIAN' | 'SCHEDULE_MAINTENANCE';
    title: string;
    subtitle?: string;
    severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
    asset_id?: number | null;
    asset_code?: string;
    asset_name?: string;
    confidence?: number;
    payload: {
        title?: string;
        symptom?: string;
        asset_id?: number | null;
        severity?: string;
        priority?: string;
        space_name?: string;
        due_date?: string;
        description?: string;
        assignee_name?: string;
        [key: string]: any;
    };
    status: 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'DISMISSED';
    execution_result?: {
        success: boolean;
        message: string;
        created_id?: any;
        link?: string;
    };
}

export interface AIAnalyticsSummaryResponse {
    healthScore: number;
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    executiveSummary: string;
    keyFindings: string[];
    rootCauses: string[];
    prescriptiveRecommendations: string[];
    actionCards: ActionCardData[];
    metrics: any;
    openIncidentsCount: number;
    criticalIncidentsCount: number;
    period: string;
    generatedAt: string;
}

export interface AIChatMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    isStreaming?: boolean;
    isSearching?: boolean;
    followUps?: string[];
    actionCard?: ActionCardData;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: AIChatMessage[];
    timestamp: number;
}
