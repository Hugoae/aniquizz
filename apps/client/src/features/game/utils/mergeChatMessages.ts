import type { ChatMessage } from '@aniquizz/shared';

export const LOCAL_CHAT_ID_PREFIX = 'local:';

export function createLocalChatMessage(input: {
  senderId: string;
  username: string;
  avatar?: string;
  content: string;
}): ChatMessage {
  return {
    id: `${LOCAL_CHAT_ID_PREFIX}${crypto.randomUUID()}`,
    senderId: input.senderId,
    username: input.username,
    avatar: input.avatar,
    content: input.content,
    timestamp: Date.now(),
    isSystem: false,
  };
}

export function isLocalChatMessage(message: ChatMessage): boolean {
  return message.id.startsWith(LOCAL_CHAT_ID_PREFIX);
}

/** Append a server echo, replacing a matching optimistic local row when present. */
export function mergeChatMessage(prev: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (prev.some((message) => message.id === incoming.id)) return prev;
  const optimisticIndex = prev.findIndex(
    (message) =>
      isLocalChatMessage(message) &&
      message.senderId === incoming.senderId &&
      message.content === incoming.content,
  );
  if (optimisticIndex >= 0) {
    const next = [...prev];
    next[optimisticIndex] = incoming;
    return next;
  }
  return [...prev, incoming];
}

export function dropLastLocalChatMessage(prev: ChatMessage[], senderId: string): ChatMessage[] {
  for (let i = prev.length - 1; i >= 0; i -= 1) {
    const message = prev[i];
    if (isLocalChatMessage(message) && message.senderId === senderId) {
      return [...prev.slice(0, i), ...prev.slice(i + 1)];
    }
  }
  return prev;
}
