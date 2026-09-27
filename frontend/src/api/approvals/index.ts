import { beApi } from "../callApi";

export interface ApprovalItem {
  approval_id: number;
  task_id: number;
  task_name: string;
  task_description: string;
  priority: string;
  work_item_type: string;
  requester_name: string;
  requester_email: string;
  requester_avatar: string;
  step_order: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decision_note: string;
  created_at: string;
}

export const getPendingApprovals = async (): Promise<{ success: boolean; data: ApprovalItem[] }> => {
  return beApi.get("/approvals/pending");
};

export const makeApprovalDecision = async (
  approvalId: number,
  payload: { status: "APPROVED" | "REJECTED"; decisionNote?: string }
) => {
  return beApi.post(`/approvals/${approvalId}/decision`, payload);
};
