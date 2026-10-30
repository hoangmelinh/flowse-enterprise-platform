import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { WorkItem, WorkflowTransition, WorkItemType } from '../../domain/entities/workitem';
import apiClient from '../api/apiClient';

export class WorkItemRepositoryImpl implements IWorkItemRepository {
  async getMyWorkItems(filterType?: WorkItemType): Promise<WorkItem[]> {
    const params: Record<string, string> = {};
    if (filterType) {
      params.type = filterType;
    }
    const res = await apiClient.get('/tasks/my-tasks', { params });
    // API trả về nhóm theo trạng thái: [{ id, name, tasks: [...] }]
    const groups: any[] = Array.isArray(res.data) ? res.data : [];
    return groups.flatMap((g) => g.tasks ?? []).map((item: any) => this.mapToWorkItem(item));
  }

  async getWorkItemById(id: number): Promise<WorkItem> {
    const res = await apiClient.get(`/tasks/${id}`);
    return this.mapToWorkItem(res.data?.task || res.data);
  }

  async getAvailableTransitions(workItemId: number): Promise<WorkflowTransition[]> {
    const res = await apiClient.get(`/workflows/tasks/${workItemId}/transitions`);
    return (res.data || []).map((t: any) => ({
      id: t.transition_id,
      transitionName: t.transition_name,
      fromStateId: t.from_state_id,
      toStateId: t.to_state_id,
      toStateName: t.to_state_name,
      toStateColor: t.to_state_color,
      allowedRoles: t.allowed_roles || [],
      requiredFields: t.required_fields || [],
      requiresApproval: !!t.requires_approval,
      triggerAction: t.trigger_action,
    }));
  }

  async transitionWorkItem(
    workItemId: number,
    toStateId: number,
    baseVersion: number,
    note?: string
  ): Promise<WorkItem> {
    const res = await apiClient.post(`/workflows/tasks/${workItemId}/transition`, {
      to_state_id: toStateId,
      base_version: baseVersion,
      note,
    });
    return this.mapToWorkItem(res.data?.task || res.data);
  }

  async assignWorkItem(workItemId: number, assigneeId: number): Promise<WorkItem> {
    const res = await apiClient.post(`/tasks/${workItemId}/assign`, {
      assignee_id: assigneeId,
    });
    return this.mapToWorkItem(res.data?.task || res.data);
  }

  async createTask(data: {
    title: string;
    description?: string;
    listId: number;
    priority?: string;
  }): Promise<WorkItem> {
    const res = await apiClient.post('/tasks', {
      name: data.title,
      description: data.description,
      list_id: data.listId,
      priority: data.priority || 'Normal',
    });
    return this.mapToWorkItem(res.data?.task || res.data);
  }

  private mapToWorkItem(item: any): WorkItem {
    return {
      id: item.task_id || item.id,
      type: (item.work_item_type || 'TASK') as WorkItemType,
      title: item.name || item.title || '',
      description: item.description,
      priority: item.priority || 'Normal',
      statusId: item.status_id,
      statusName: item.status_name,
      dueDate: item.due_date || undefined,
      listId: item.list_id,
      creatorId: item.created_by,
      creatorName: item.creator_name,
      creatorAvatar: item.creator_avatar,
      assigneeId: item.assignee_id,
      assigneeName: item.assignee_name,
      assigneeAvatar: item.assignee_avatar,
      workflowId: item.workflow_id,
      currentStateId: item.current_state_id,
      currentState: item.state_name
        ? {
            id: item.current_state_id,
            code: item.state_code || '',
            name: item.state_name,
            color: item.state_color || '#6B7280',
            isInitial: !!item.is_initial,
            isTerminal: !!item.is_terminal,
            position: item.state_position || 0,
          }
        : undefined,
      sla: item.sla_status
        ? {
            id: item.sla_instance_id || 0,
            status: item.sla_status,
            startedAt: item.sla_started_at || '',
            deadlineAt: item.sla_deadline_at || '',
            warningSent: !!item.sla_warning_sent,
          }
        : undefined,
      version: item.version || 1,
      createdAt: item.created_at || '',
      updatedAt: item.updated_at || '',
    };
  }
}
