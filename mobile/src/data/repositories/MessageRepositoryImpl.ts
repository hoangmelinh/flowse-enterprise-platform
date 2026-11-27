import { AuthError, NetworkError, PermissionError } from '../../core/errors/AppError';
import { ChatMessage, Conversation, ConversationType, WorkspaceMember } from '../../domain/entities/message';
import apiClient from '../api/apiClient';

interface ConversationMemberDto {
  user_id: number;
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface ConversationDto {
  conversation_id: number;
  workspace_id: number;
  type: ConversationType;
  name: string | null;
  space_id: number | null;
  created_by: number | null;
  created_at: string;
  members?: ConversationMemberDto[] | null;
  last_message?: {
    content: string;
    sender_id: number;
    created_at: string;
    sender_name?: string | null;
  } | null;
  message_count?: number | string | null;
}

export interface MessageDto {
  message_id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  sender_name?: string | null;
  sender_username?: string | null;
  sender_avatar?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

interface WorkspaceMemberDto {
  user_id: number;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  department_name?: string | null;
  role_name?: string | null;
}

export const mapMessageDto = (m: MessageDto): ChatMessage => ({
  id: Number(m.message_id),
  conversationId: Number(m.conversation_id),
  senderId: Number(m.sender_id),
  senderName: m.sender_name || m.sender_username || 'Thành viên',
  senderUsername: m.sender_username || '',
  senderAvatar: m.sender_avatar ?? null,
  content: m.content || '',
  fileUrl: m.file_url ?? null,
  fileName: m.file_name ?? null,
  fileType: m.file_type ?? null,
  createdAt: m.created_at,
});

export class MessageRepositoryImpl {
  async getConversations(workspaceId: number, currentUserId?: number | null): Promise<Conversation[]> {
    try {
      const res = await apiClient.get<ConversationDto[]>('/messages/conversations', {
        params: { workspace_id: workspaceId },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map((c) => this.mapConversation(c, currentUserId));
    } catch (error) {
      throw this.readableError(error, 'Không tải được danh sách hội thoại.');
    }
  }

  async getMessages(conversationId: number, limit = 50, before?: string): Promise<ChatMessage[]> {
    try {
      const res = await apiClient.get<MessageDto[]>(`/messages/${conversationId}`, {
        params: { limit, ...(before ? { before } : {}) },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map(mapMessageDto);
    } catch (error) {
      throw this.readableError(error, 'Không tải được nội dung trò chuyện.');
    }
  }

  async sendMessage(conversationId: number, content: string): Promise<ChatMessage> {
    try {
      const res = await apiClient.post<MessageDto>(`/messages/${conversationId}`, { content });
      return mapMessageDto(res.data);
    } catch (error) {
      throw this.readableError(error, 'Không gửi được tin nhắn.');
    }
  }

  async startDirectMessage(workspaceId: number, targetUserId: number): Promise<number> {
    try {
      const res = await apiClient.post<{ conversation_id: number }>('/messages/direct', {
        workspace_id: workspaceId,
        target_user_id: targetUserId,
      });
      return Number(res.data.conversation_id);
    } catch (error) {
      throw this.readableError(error, 'Không mở được cuộc trò chuyện.');
    }
  }

  async createChannel(workspaceId: number, name: string, memberIds: number[]): Promise<Conversation> {
    try {
      const cleanName = name.trim().replace(/^#+/, '').trim();
      const res = await apiClient.post<ConversationDto>('/messages/channels', {
        workspace_id: workspaceId,
        name: cleanName,
        member_ids: memberIds,
      });
      return this.mapConversation(res.data);
    } catch (error) {
      throw this.readableError(error, 'Không tạo được kênh mới.');
    }
  }

  async addMember(conversationId: number, userId: number): Promise<void> {
    try {
      await apiClient.post(`/messages/conversations/${conversationId}/members`, { user_id: userId });
    } catch (error) {
      throw this.readableError(error, 'Không thêm được thành viên vào kênh.');
    }
  }

  async removeMember(conversationId: number, userId: number): Promise<void> {
    try {
      await apiClient.delete(`/messages/conversations/${conversationId}/members/${userId}`);
    } catch (error) {
      throw this.readableError(error, 'Không xóa được thành viên khỏi kênh.');
    }
  }

  async getWorkspaceMembers(workspaceId: number): Promise<WorkspaceMember[]> {
    try {
      const res = await apiClient.get<WorkspaceMemberDto[]>(`/workspaces/${workspaceId}/members`);
      const rows = Array.isArray(res.data) ? res.data : [];
      return rows.map((m) => ({
        userId: Number(m.user_id),
        name: m.name || m.username || 'Thành viên',
        username: m.username || '',
        email: m.email || '',
        departmentName: m.department_name ?? null,
        roleName: m.role_name ?? null,
        avatarUrl: m.avatar_url ?? null,
      }));
    } catch (error) {
      throw this.readableError(error, 'Không tải được danh sách thành viên.');
    }
  }

  private mapConversation(c: ConversationDto, currentUserId?: number | null): Conversation {
    const members = Array.isArray(c.members)
      ? c.members.map((m) => ({
          userId: Number(m.user_id),
          name: m.name || m.username || 'Thành viên',
          username: m.username || '',
          avatarUrl: m.avatar_url ?? null,
        }))
      : [];

    const kind: Conversation['kind'] = c.type === 'CHANNEL' ? 'channel' : c.type === 'SPACE' ? 'space' : 'direct';
    let displayName = c.name?.trim() || '';
    if (c.type === 'DIRECT') {
      const other = members.find((m) => currentUserId == null || m.userId !== Number(currentUserId)) ?? members[0];
      displayName = other?.name || 'Trò chuyện riêng';
    } else if (c.type === 'CHANNEL') {
      displayName = displayName ? (displayName.startsWith('#') ? displayName : `#${displayName}`) : '#kênh';
    } else if (!displayName) {
      displayName = 'Không gian';
    }

    return {
      id: Number(c.conversation_id),
      workspaceId: Number(c.workspace_id),
      type: c.type,
      kind,
      name: displayName,
      spaceId: c.space_id ?? null,
      createdBy: c.created_by ?? null,
      members,
      lastMessage: c.last_message
        ? {
            content: c.last_message.content || '',
            senderId: Number(c.last_message.sender_id),
            senderName: c.last_message.sender_name || 'Thành viên',
            createdAt: c.last_message.created_at,
          }
        : null,
      messageCount: Number(c.message_count ?? 0),
      createdAt: c.created_at,
    };
  }

  private readableError(error: unknown, fallback: string): Error {
    if (error instanceof AuthError) return new AuthError();
    if (error instanceof PermissionError) return new PermissionError();
    if (error instanceof NetworkError) return new NetworkError();
    return new Error(fallback);
  }
}
