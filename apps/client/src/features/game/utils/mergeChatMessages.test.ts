import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@aniquizz/shared';
import {
  createLocalChatMessage,
  dropLastLocalChatMessage,
  mergeChatMessage,
} from './mergeChatMessages';

const echo = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'server-1',
  senderId: 'u1',
  username: 'Hugo',
  content: 'salut',
  timestamp: 1,
  isSystem: false,
  ...overrides,
});

describe('mergeChatMessage', () => {
  it('replaces a matching optimistic row with the server echo', () => {
    const local = createLocalChatMessage({
      senderId: 'u1',
      username: 'Hugo',
      content: 'salut',
    });
    const merged = mergeChatMessage([local], echo());
    expect(merged).toEqual([echo()]);
  });

  it('ignores a duplicate server id', () => {
    const first = echo();
    expect(mergeChatMessage([first], echo())).toEqual([first]);
  });
});

describe('dropLastLocalChatMessage', () => {
  it('removes only the latest optimistic row for that sender', () => {
    const first = createLocalChatMessage({
      senderId: 'u1',
      username: 'Hugo',
      content: 'a',
    });
    const second = createLocalChatMessage({
      senderId: 'u1',
      username: 'Hugo',
      content: 'b',
    });
    expect(dropLastLocalChatMessage([first, second], 'u1')).toEqual([first]);
  });
});
