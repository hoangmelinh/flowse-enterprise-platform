import apiClient from '../api/apiClient';
import { toPlainText } from '../../core/utils/plainText';

export type AiTurn = { role: 'user' | 'assistant'; content: string };

/** Đề xuất của Flowse AI chế độ Work (bảng ai_actions). Chỉ ghi vào dữ liệu khi người dùng áp dụng. */
export type AiAction = {
  action_id: number;
  action_type: 'CREATE_TASK' | 'UPDATE_TASK' | 'ASSIGN_TASK' | 'DELETE_TASK';
  status: 'PENDING' | 'APPLYING' | 'APPLIED' | 'CANCELLED' | 'FAILED';
  summary: { title: string; rows: [string, string][] };
  result?: { task_id?: number; message?: string } | null;
  created_at: string;
};

/** Câu lỗi backend trả về ({ message }), không có thì câu chung. */
export const aiErrorText = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || (e as Error)?.message || 'Flowse AI chưa trả lời được. Kiểm tra kết nối rồi thử lại.';

/**
 * Flowse AI qua backend. Chat: POST /ai/chat → { response } (Markdown, app hiện chữ thường).
 * Work: POST /ai/work → { data: { response, action } }; áp dụng / huỷ qua /ai/actions/:id.
 */
export class AiRepositoryImpl {
  async chat(message: string, history: AiTurn[]): Promise<string> {
    const res = await apiClient.post('/ai/chat', { message, history: history.slice(-12) });
    return toPlainText(String(res.data?.response ?? ''));
  }

  async work(message: string, history: AiTurn[]): Promise<{ text: string; action: AiAction | null }> {
    const res = await apiClient.post('/ai/work', { message, history: history.slice(-12) });
    return { text: toPlainText(String(res.data?.data?.response ?? '')), action: res.data?.data?.action ?? null };
  }

  async apply(actionId: number): Promise<AiAction> {
    return (await apiClient.post(`/ai/actions/${actionId}/apply`)).data.data;
  }

  async cancel(actionId: number): Promise<AiAction> {
    return (await apiClient.post(`/ai/actions/${actionId}/cancel`)).data.data;
  }

  async actions(): Promise<AiAction[]> {
    return (await apiClient.get('/ai/actions')).data.data ?? [];
  }
}
