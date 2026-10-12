import { beApi } from "../callApi";

export interface WorkflowTransition {
  transition_id: number;
  transition_name: string;
  to_state_id: number;
  to_state_code: string;
  to_state_name: string;
  to_state_color: string;
  is_terminal: boolean;
  requires_approval?: boolean;
  required_fields?: string[];
}

export const getTaskTransitions = async (
  taskId: number | string
): Promise<{ success: boolean; data: WorkflowTransition[] }> => {
  return beApi.get(`/workflows/task/${taskId}/transitions`);
};

export const executeTransition = async (
  taskId: number | string,
  payload: { toStateId: number; note?: string; metadata?: any }
): Promise<{ success: boolean; message: string; data: any }> => {
  return beApi.post(`/workflows/task/${taskId}/transition`, payload);
};
