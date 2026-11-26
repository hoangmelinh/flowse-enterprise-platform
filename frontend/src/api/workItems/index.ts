import { beApi } from '../callApi';

export type WorkItemType = 'TASK' | 'INCIDENT' | 'REQUEST' | 'INSPECTION';

export interface WorkItemSummary {
    id: number;
    type: WorkItemType;
    title: string;
    description?: string | null;
    priority: string;
    due_date?: string | null;
    version?: number;
    department_id?: number | null;
    department_name?: string | null;
    current_state_code?: string | null;
    current_state_name?: string | null;
    state_color?: string | null;
    is_terminal?: boolean;
    sla_status?: 'IN_SLA' | 'AT_RISK' | 'BREACHED' | 'PAUSED' | 'COMPLETED' | null;
    sla_deadline_at?: string | null;
    asset_name?: string | null;
    asset_code?: string | null;
    created_at: string;
    updated_at: string;
}

export interface MyWorkBuckets {
    overdue: WorkItemSummary[];
    today: WorkItemSummary[];
    in_progress: WorkItemSummary[];
    waiting: WorkItemSummary[];
    completed: WorkItemSummary[];
}

export interface MyWorkResponse {
    success: boolean;
    data: {
        total_count: number;
        buckets: MyWorkBuckets;
    };
}

export interface WorkItemDetail extends WorkItemSummary {
    assignees?: Array<{ user_id: number; name: string; email: string; avatar_url?: string | null }>;
    incident?: { symptom?: string; severity?: string; [key: string]: unknown } | null;
    available_transitions?: Array<{ transition_id: number; transition_name: string }>;
    activity_logs?: Array<{
        activity_id: number;
        action: string;
        actor_name?: string;
        old_value?: Record<string, unknown> | null;
        new_value?: Record<string, unknown> | null;
        created_at: string;
    }>;
    creator_name?: string;
    creator_email?: string;
}

export const getMyWork = async (): Promise<MyWorkResponse> => {
    return beApi.get('/work-items/my-work');
};

export const getWorkItemById = async (id: number | string): Promise<{ success: boolean; data: WorkItemDetail }> => {
    return beApi.get(`/work-items/${id}`);
};

export const createWorkItem = async (payload: {
    title: string;
    description?: string;
    work_item_type: WorkItemType;
    priority?: 'Urgent' | 'High' | 'Normal' | 'Low';
    due_date?: string;
    department_id?: number;
    list_id?: number;
    asset_id?: number;
    symptom?: string;
    evidence_urls?: string[];
}): Promise<{ success: boolean; message: string; data: WorkItemSummary }> => {
    return beApi.post('/work-items', payload);
};
