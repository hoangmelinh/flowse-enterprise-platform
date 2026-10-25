import { Approval, ApprovalDecisionParams } from '../entities/approval';

export interface IApprovalRepository {
  getPendingApprovals(): Promise<Approval[]>;
  makeDecision(params: ApprovalDecisionParams): Promise<Approval>;
}
