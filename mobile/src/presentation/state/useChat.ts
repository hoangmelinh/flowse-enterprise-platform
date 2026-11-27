import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import config from '../../core/config';
import { ChatMessage, Conversation } from '../../domain/entities/message';
import { mapMessageDto, MessageDto, MessageRepositoryImpl } from '../../data/repositories/MessageRepositoryImpl';
import { connectSocket, disconnectSocket } from '../../data/api/socketClient';
import { NetworkError } from '../../core/errors/AppError';
import { useAuthStore } from './authStore';

const repo = new MessageRepositoryImpl();

export const useConversations = () => {
  const userId = useAuthStore((s) => s.user?.id);
  const workspaceId = useAuthStore((s) => s.currentWorkspace?.id);
  return useQuery({
    queryKey: ['conversations', workspaceId, userId],
    enabled: !config.demo && !!userId && !!workspaceId,
    queryFn: () => repo.getConversations(workspaceId!, userId),
    staleTime: 10_000,
  });
};

export const useWorkspaceMembers = () => {
  const workspaceId = useAuthStore((s) => s.currentWorkspace?.id);
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    enabled: !config.demo && !!workspaceId,
    queryFn: () => repo.getWorkspaceMembers(workspaceId!),
    staleTime: 60_000,
  });
};

export const useConversationMessages = (conversationId: number) => {
  const user = useAuthStore((s) => s.user);
  const workspaceId = useAuthStore((s) => s.currentWorkspace?.id);
  const client = useQueryClient();
  const queryKey = ['messages', conversationId];

  const query = useQuery({
    queryKey,
    enabled: !config.demo && Number.isInteger(conversationId) && conversationId > 0 && !!user?.id,
    queryFn: () => repo.getMessages(conversationId),
    staleTime: 0,
  });

  const send = useMutation({
    mutationFn: (vars: { content: string; tempId: number }) => repo.sendMessage(conversationId, vars.content),
    onMutate: async ({ content, tempId }) => {
      await client.cancelQueries({ queryKey });
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user?.id ?? 0,
        senderName: user?.name || user?.username || 'Bạn',
        senderUsername: user?.username || '',
        content,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      client.setQueryData<ChatMessage[]>(queryKey, (prev = []) => [...prev, optimistic]);
      return { tempId };
    },
    onSuccess: (saved, _vars, ctx) => {
      client.setQueryData<ChatMessage[]>(queryKey, (prev = []) => {
        const replaced = prev.map((m) => (m.id === ctx?.tempId ? saved : m));
        const seen = new Set<number>();
        return replaced.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
      });
      void client.invalidateQueries({ queryKey: ['conversations', workspaceId, user?.id] });
    },
    onError: (err, _vars, ctx) => {
      const offline = err instanceof NetworkError;
      client.setQueryData<ChatMessage[]>(queryKey, (prev = []) =>
        prev.map((m) => (m.id === ctx?.tempId ? { ...m, pending: false, failed: true } : m))
      );
      if (offline) void err;
    },
  });

  const retryFailed = (msg: ChatMessage) => {
    client.setQueryData<ChatMessage[]>(queryKey, (prev = []) => prev.filter((m) => m.id !== msg.id));
    send.mutate({ content: msg.content, tempId: -Date.now() });
  };

  return { ...query, messages: query.data ?? [], send, retryFailed };
};

export const useRealtimeSync = () => {
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const workspaceId = useAuthStore((s) => s.currentWorkspace?.id);
  const client = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (config.demo || !token || !userId) {
      disconnectSocket();
      setConnected(false);
      return;
    }

    const socket = connectSocket(token);
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onMessage = (raw: MessageDto) => {
      const msg = mapMessageDto(raw);
      client.setQueryData<ChatMessage[]>(['messages', msg.conversationId], (prev) => {
        if (!prev) return prev;
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      client.setQueryData<Conversation[]>(['conversations', workspaceId, userId], (prev) => {
        if (!prev) return prev;
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) return prev;
        const target = prev[idx];
        const updated: Conversation = {
          ...target,
          lastMessage: {
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            createdAt: msg.createdAt,
          },
          messageCount: target.messageCount + 1,
        };
        return [updated, ...prev.filter((_, i) => i !== idx)];
      });
      void client.invalidateQueries({ queryKey: ['conversations', workspaceId, userId] });
    };

    const onConversationUpdated = () => {
      void client.invalidateQueries({ queryKey: ['conversations', workspaceId, userId] });
    };

    const onNotification = () => {
      void client.invalidateQueries({ queryKey: ['notifications', userId] });
    };

    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onDisconnect);
    socket.on('MESSAGE_CREATED', onMessage);
    socket.on('CONVERSATION_UPDATED', onConversationUpdated);
    socket.on('NOTIFICATION_PUSH', onNotification);
    socket.on('NEW_NOTIFICATION', onNotification);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onDisconnect);
      socket.off('MESSAGE_CREATED', onMessage);
      socket.off('CONVERSATION_UPDATED', onConversationUpdated);
      socket.off('NOTIFICATION_PUSH', onNotification);
      socket.off('NEW_NOTIFICATION', onNotification);
    };
  }, [client, token, userId, workspaceId]);

  return { connected };
};
