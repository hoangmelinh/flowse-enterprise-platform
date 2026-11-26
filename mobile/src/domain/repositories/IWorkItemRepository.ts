import { WorkItem, WorkflowTransition, WorkItemType } from '../entities/workitem';

export interface IWorkItemRepository {
  getMyWorkItems(filterType?: WorkItemType): Promise<WorkItem[]>;
  getWorkItemById(id: number): Promise<WorkItem>;
  getAvailableTransitions(workItemId: number): Promise<WorkflowTransition[]>;
  transitionWorkItem(
    workItemId: number,
    toStateId: number,
    baseVersion: number,
    note?: string,
    /** Trường bắt buộc của bước chuyển, VD root_cause, resolution khi báo sửa xong */
    metadata?: Record<string, unknown>
  ): Promise<WorkItem>;
  assignWorkItem(workItemId: number, assigneeId: number): Promise<WorkItem>;
  createTask(data: {
    title: string;
    description?: string;
    listId: number;
    priority?: string;
  }): Promise<WorkItem>;
}
