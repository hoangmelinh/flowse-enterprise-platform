export type WorkItemType = 'TASK' | 'INCIDENT' | 'INSPECTION' | 'REQUEST';

export type WorkItemPriority = 'Urgent' | 'High' | 'Normal' | 'Low';

export interface WorkflowState {
  id: number;
  code: string;
  name: string;
  color: string;
  isInitial: boolean;
  isTerminal: boolean;
  position: number;
}

export interface WorkflowTransition {
  id: number;
  transitionName: string;
  fromStateId: number;
  toStateId: number;
  toStateName: string;
  toStateColor: string;
  allowedRoles: string[];
  requiredFields: string[];
  requiresApproval: boolean;
  triggerAction?: string;
}

export type SLAStatus = 'IN_SLA' | 'AT_RISK' | 'BREACHED' | 'COMPLETED';

export interface SLAInstance {
  id: number;
  status: SLAStatus;
  startedAt: string;
  deadlineAt: string;
  warningSent: boolean;
  remainingMinutes?: number;
}

export interface WorkItem {
  id: number;
  type: WorkItemType;
  title: string;
  description?: string;
  priority: WorkItemPriority;
  statusId?: number;
  listId: number;
  creatorId: number;
  creatorName?: string;
  creatorAvatar?: string;
  assigneeId?: number;
  assigneeName?: string;
  assigneeAvatar?: string;
  workflowId?: number;
  currentStateId?: number;
  currentState?: WorkflowState;
  sla?: SLAInstance;
  version: number;
  createdAt: string;
  updatedAt: string;
}
