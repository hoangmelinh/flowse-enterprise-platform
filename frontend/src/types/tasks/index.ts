export interface Assignee {
    user_id: number;
    name: string;
    avatar_url: string | null;
}

export interface Task {
    task_id: number;
    parent_task_id: number | null;
    list_id: number | null;
    space_id: number;
    folder_id: number | null;
    name: string;
    description: string | null;
    status_id: number | null;
    status_name: string | null;
    status_color: string | null;

    priority_name: string | null;
    priority_color: string | null;

    due_date: string | null;
    position: number;
    subtask_count: number;
    subtask_done_count: number;
    comment_count: number;
    attachment_count: number;
    assignees: Assignee[];

    // Extended fields from API (optional)
    space_name?: string;
    list_name?: string;
    space_color?: string | null;
    completed_at?: string | null;
    created_by?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface StatusGroup {
    id: number;
    name: string;
    color: string;
    isExpanded: boolean;
    tasks: Task[];
}

export interface NewTaskData {
    name: string;
    description?: string | null;
    list_id: number;
    parent_task_id?: number | null;
    status_id?: number;
    status?: string;
    statusColor?: string;
    priority?: string;
    priorityColor?: string;
    due_date?: string | null;
    assignee_ids?: number[];
    assignees?: string[];
    listId?: number;
}

export interface NewMilestoneData {
    name: string;
    description?: string | null;
    status?: 'on_track' | 'at_risk' | 'completed' | 'cancelled';
    color?: string;
    dueDate?: string | null;
}

// ── Types moved from /pages per project rules ──────────────────────────────

import type React from 'react';

export interface TaskViewContextType {
    groups: StatusGroup[];
    setGroups: React.Dispatch<React.SetStateAction<StatusGroup[]>>;
    listId: number;
    showClosed: boolean;
    columns: { assignee: boolean; dueDate: boolean; priority: boolean };
    setSelectedTask: (t: Task | null) => void;
    onContextMenu: (e: React.MouseEvent, task: Task) => void;
    updateTask: (taskId: number, updates: Partial<Task>) => void;
    handleInlineCreate: (groupId: number, name: string, extras?: { assignees?: Assignee[]; due_date?: string | null; priority_id?: number | null; priority_name?: string | null; priority_color?: string | null }) => void;
    handleCreateStatus: (name: string, color: string) => void;
}

export type TabType = 'assigned' | 'mentions' | 'created';

export interface InlineCreateTaskProps {
    isActive: boolean;
    text: string;
    onChangeText: (val: string) => void;
    onActivate: () => void;
    onCancel: () => void;
    onSubmit: (extras?: {
        assignees?: Assignee[];
        due_date?: string | null;
        priority_id?: number | null;
        priority_name?: string | null;
        priority_color?: string | null;
    }) => void;
}
