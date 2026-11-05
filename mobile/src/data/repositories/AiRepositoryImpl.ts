import apiClient from '../api/apiClient';
import { toPlainText } from '../../core/utils/plainText';

export type AiTurn = { role: 'user' | 'assistant'; content: string };

/**
 * Flowse AI qua backend (POST /ai/chat → { response }). Backend đã thêm việc đang mở của người hỏi vào ngữ cảnh.
 * Trả lời có Markdown; app hiện chữ thường nên bỏ ký hiệu và đổi bảng thành dòng.
 */
export class AiRepositoryImpl {
  async chat(message: string, history: AiTurn[]): Promise<string> {
    const res = await apiClient.post('/ai/chat', { message, history: history.slice(-12) });
    return toPlainText(String(res.data?.response ?? ''));
  }
}
