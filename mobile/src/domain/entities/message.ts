export type ConversationType = 'DIRECT' | 'CHANNEL' | 'SPACE';

export interface ConversationMember {
  userId: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface WorkspaceMember {
  userId: number;
  name: string;
  username: string;
  email: string;
  departmentName?: string | null;
  roleName?: string | null;
  avatarUrl?: string | null;
}

export interface Conversation {
  id: number;
  workspaceId: number;
  type: ConversationType;
  kind: 'direct' | 'channel' | 'space';
  name: string;
  spaceId: number | null;
  createdBy: number | null;
  members: ConversationMember[];
  lastMessage: {
    content: string;
    senderId: number;
    senderName: string;
    createdAt: string;
  } | null;
  messageCount: number;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderUsername: string;
  senderAvatar?: string | null;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}
