import { WorkItemPriority, WorkItemType } from './workitem';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Approval {
  id: number;
  taskId: number;
  taskTitle: string;
  taskDescription?: string;
  priority: WorkItemPriority;
  workItemType: WorkItemType;
  requesterId: number;
  requesterName: string;
  requesterEmail: string;
  requesterAvatar?: string;
  stepOrder: number;
  status: ApprovalStatus;
  decisionNote?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface ApprovalDecisionParams {
  approvalId: number;
  status: 'APPROVED' | 'REJECTED';
  decisionNote?: string;
}
