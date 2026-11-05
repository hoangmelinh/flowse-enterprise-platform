import { IApprovalRepository } from '../../domain/repositories/IApprovalRepository';
import { Approval, ApprovalDecisionParams } from '../../domain/entities/approval';
import apiClient from '../api/apiClient';
import { AppError, AuthError, ConflictError, NetworkError, PermissionError } from '../../core/errors/AppError';

interface ApprovalResponse {
  approval_id: number;
  task_id: number;
  status: Approval['status'];
  task_name?: string | null;
  task_description?: string | null;
  priority?: Approval['priority'] | null;
  work_item_type?: Approval['workItemType'] | null;
  requester_name?: string | null;
  requester_email?: string | null;
  requester_avatar?: string | null;
  step_order?: number | null;
  request_note?: string | null;
  decision_note?: string | null;
  decided_at?: string | null;
  created_at: string;
}

export class ApprovalRepositoryImpl implements IApprovalRepository {
  async getPendingApprovals(): Promise<Approval[]> {
    try {
      // Danh sách đã được backend giới hạn theo phạm vi người duyệt.
      const res = await apiClient.get<{ success: boolean; data: ApprovalResponse[] }>('/approvals/pending');
      if (res.data?.success !== true || !Array.isArray(res.data.data)) throw this.invalidResponse();
      return res.data.data.map((a) => this.mapToApproval(a));
    } catch (error) {
      throw this.readableError(error, false);
    }
  }

  async makeDecision(params: ApprovalDecisionParams): Promise<Approval> {
    const decisionNote = params.decisionNote?.trim();
    if (!Number.isInteger(params.approvalId) || params.approvalId <= 0 || !['APPROVED', 'REJECTED'].includes(params.status)) {
      throw new AppError('Quyết định phê duyệt không hợp lệ.', 'VALIDATION_ERROR');
    }
    if (params.status === 'REJECTED' && !decisionNote) {
      throw new AppError('Nhập lý do trước khi từ chối.', 'VALIDATION_ERROR');
    }
    try {
      const res = await apiClient.post<{ success: boolean; data: ApprovalResponse }>(`/approvals/${params.approvalId}/decision`, {
        status: params.status,
        decisionNote,
      });
      if (res.data?.success !== true) throw this.invalidResponse();
      const approval = this.mapToApproval(res.data.data);
      if (approval.id !== params.approvalId || approval.status !== params.status) throw this.invalidResponse();
      return approval;
    } catch (error) {
      throw this.readableError(error, true);
    }
  }

  private mapToApproval(a: ApprovalResponse): Approval {
    if (!a || !Number.isInteger(a.approval_id) || a.approval_id <= 0 || !Number.isInteger(a.task_id) || a.task_id <= 0 ||
        !['PENDING', 'APPROVED', 'REJECTED'].includes(a.status) || typeof a.created_at !== 'string' ||
        [a.task_name, a.task_description, a.requester_name, a.requester_email, a.requester_avatar, a.request_note, a.decision_note, a.decided_at]
          .some((value) => value != null && typeof value !== 'string')) throw this.invalidResponse();
    return {
      id: a.approval_id,
      taskId: a.task_id,
      taskTitle: a.task_name || 'Yêu cầu phê duyệt',
      taskDescription: a.task_description ?? undefined,
      priority: a.priority || 'Normal',
      workItemType: a.work_item_type || 'REQUEST',
      requesterName: a.requester_name || 'Người đề nghị',
      requesterEmail: a.requester_email || '',
      requesterAvatar: a.requester_avatar ?? undefined,
      stepOrder: a.step_order || 1,
      status: a.status,
      requestNote: a.request_note ?? undefined,
      decisionNote: a.decision_note ?? undefined,
      decidedAt: a.decided_at ?? undefined,
      createdAt: a.created_at,
    };
  }

  private invalidResponse(): AppError {
    return new AppError('Dữ liệu phê duyệt không hợp lệ. Vui lòng tải lại danh sách.', 'INVALID_RESPONSE');
  }

  private readableError(error: unknown, deciding: boolean): Error {
    if (error instanceof PermissionError) return new PermissionError('Bạn không có quyền xử lý phiếu này.');
    if (error instanceof ConflictError) return new ConflictError('Phiếu đã được người khác xử lý. Danh sách đang được tải lại.');
    if (error instanceof AuthError) return new AuthError();
    if (error instanceof NetworkError) return deciding
      ? new NetworkError('Chưa xác nhận được kết quả. Vui lòng kiểm tra mạng và tải lại danh sách trước khi quyết định tiếp.')
      : new NetworkError();
    if (error instanceof AppError && error.code === 'INVALID_RESPONSE') return error;
    return new Error(deciding
      ? 'Không thể ghi nhận quyết định. Vui lòng tải lại danh sách để kiểm tra trạng thái phiếu.'
      : 'Không tải được danh sách phê duyệt. Vui lòng thử lại.');
  }
}
