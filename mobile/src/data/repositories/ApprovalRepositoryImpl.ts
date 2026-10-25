import { IApprovalRepository } from '../../domain/repositories/IApprovalRepository';
import { Approval, ApprovalDecisionParams } from '../../domain/entities/approval';
import apiClient from '../api/apiClient';

export class ApprovalRepositoryImpl implements IApprovalRepository {
  async getPendingApprovals(): Promise<Approval[]> {
    const res = await apiClient.get('/approvals');
    return (res.data || []).map((a: any) => this.mapToApproval(a));
  }

  async makeDecision(params: ApprovalDecisionParams): Promise<Approval> {
    const res = await apiClient.post(`/approvals/${params.approvalId}/decision`, {
      status: params.status,
      decision_note: params.decisionNote,
    });
    return this.mapToApproval(res.data?.approval || res.data);
  }

  private mapToApproval(a: any): Approval {
    return {
      id: a.approval_id,
      taskId: a.task_id,
      taskTitle: a.task_name || 'Yêu cầu phê duyệt',
      taskDescription: a.task_description,
      priority: a.priority || 'Normal',
      workItemType: a.work_item_type || 'REQUEST',
      requesterId: a.requester_id || 0,
      requesterName: a.requester_name || 'N/A',
      requesterEmail: a.requester_email || '',
      requesterAvatar: a.requester_avatar,
      stepOrder: a.step_order || 1,
      status: a.status || 'PENDING',
      decisionNote: a.decision_note,
      decidedAt: a.decided_at,
      createdAt: a.created_at,
    };
  }
}
