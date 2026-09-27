import { beApi } from "../callApi";

export interface WorkflowState {
  state_id: number;
  workflow_id: number;
  code: string;
  name: string;
  color: string;
  is_terminal: boolean;
  is_initial: boolean;
  position: number;
}

export interface WorkflowTransition {
  transition_id: number;
  transition_name: string;
  to_state_id: number;
  to_state_code: string;
  to_state_name: string;
  to_state_color: string;
  requires_approval: boolean;
  required_fields: string[];
}

export const getWorkflows = async () => {
  return beApi.get("/workflows");
};

export const getTaskTransitions = async (taskId: number): Promise<{ success: boolean; data: WorkflowTransition[] }> => {
  return beApi.get(`/workflows/task/${taskId}/transitions`);
};

export const executeTransition = async (taskId: number, payload: { toStateId: number; note?: string; metadata?: any }) => {
  return beApi.post(`/workflows/task/${taskId}/transition`, payload);
};
