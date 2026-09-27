export interface ActivityLog {
    activity_id: number;
    task_id: number;
    user_id: number | null;
    action: ActivityAction;
    /** Nhãn tiếng Việt, được tạo bởi CASE expression ở backend */
    action_label: string;
    old_value: unknown;
    new_value: unknown;
    created_at: string;

    // ── Task context (joined từ tasks) ────────────────────────────────────────
    task_name: string;
    priority: 'Urgent' | 'High' | 'Normal' | 'Low' | 'Clear';

    // ── List context (joined từ lists) ────────────────────────────────────────
    list_id: number;
    list_name: string;
    /** Chỉ có trong findActivitiesByUserId */
    space_id?: number;

    // ── Status context (joined từ task_status) ────────────────────────────────
    status_name: string | null;
    status_color: string | null;

    // ── Actor (joined từ users) ───────────────────────────────────────────────
    username: string | null;
    user_name: string | null;
    avatar_url: string | null;
}

export type ActivityAction =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'status_changed'
    | 'priority_changed'
    | 'assigned'
    | 'unassigned'
    | 'commented'
    | 'attachment_added'
    | 'attachment_removed'
    | 'due_date_changed'
    | 'start_date_changed'
    | 'moved'
    | 'archived'
    | 'restored'
    | 'timer_started'
    | 'timer_stopped'
    | 'sprint_assigned'
    | 'milestone_assigned'
    | 'tag_added'
    | 'tag_removed'
    | 'subtask_added'
    | 'story_points_changed';
