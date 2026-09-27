import { beApi } from '../callApi';

export interface ConversationData {
    conversation_id: number;
    workspace_id: number;
    type: 'DIRECT' | 'CHANNEL' | 'SPACE';
    name: string | null;
    space_id: number | null;
    created_by: number | null;
    created_at: string;
    members: { user_id: number; name: string; username: string; avatar_url: string | null }[] | null;
    last_message: { content: string; sender_id: number; created_at: string; sender_name: string } | null;
    message_count: number;
}

export interface MessageData {
    message_id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    created_at: string;
    sender_name: string;
    sender_username: string;
    sender_avatar: string | null;
    file_url?: string;
    file_name?: string;
    file_type?: string;
}

export const getConversations = (workspaceId: number): Promise<ConversationData[]> =>
    beApi.get(`/messages/conversations?workspace_id=${workspaceId}`);

export const startDirect = (workspaceId: number, targetUserId: number): Promise<{ conversation_id: number }> =>
    beApi.post('/messages/direct', { workspace_id: workspaceId, target_user_id: targetUserId });

export const createChannel = (workspaceId: number, name: string, memberIds: number[]): Promise<ConversationData> =>
    beApi.post('/messages/channels', { workspace_id: workspaceId, name, member_ids: memberIds });

export const getOrCreateSpaceChat = (workspaceId: number, spaceId: number, spaceName: string): Promise<{ conversation_id: number }> =>
    beApi.post('/messages/space', { workspace_id: workspaceId, space_id: spaceId, space_name: spaceName });

export const getMessages = (conversationId: number, limit = 50): Promise<MessageData[]> =>
    beApi.get(`/messages/${conversationId}?limit=${limit}`);

export const sendMessage = (
    conversationId: number, 
    content: string, 
    driveFile?: { url: string; name: string; mimeType: string } | null
): Promise<MessageData> => {
    const body: { content: string; fileUrl?: string; fileName?: string; fileType?: string } = { content };
    if (driveFile) {
        body.fileUrl = driveFile.url;
        body.fileName = driveFile.name;
        body.fileType = driveFile.mimeType;
    }
    return beApi.post(`/messages/${conversationId}`, body);
};

export const addMember = (conversationId: number, userId: number): Promise<{ success: boolean }> =>
    beApi.post(`/messages/conversations/${conversationId}/members`, { user_id: userId });

export const removeMember = (conversationId: number, userId: number): Promise<{ success: boolean }> =>
    beApi.delete(`/messages/conversations/${conversationId}/members/${userId}`);
