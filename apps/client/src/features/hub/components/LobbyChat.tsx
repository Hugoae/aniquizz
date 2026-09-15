import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { ChatMessage } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { socket } from '@/lib/socket';
import {
  createLocalChatMessage,
  dropLastLocalChatMessage,
  isLocalChatMessage,
  mergeChatMessage,
} from '@/features/game/utils/mergeChatMessages';

interface LobbyChatProps {
  roomId: string;
  /** Canonical userId of the local player (never socket.id). */
  currentUserId: string | number;
}

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Pre-game chat for the lobby. Reuses the same `chat:sendMessage` / `chat:message`
 * contract as the in-game sidebar so a room's conversation is continuous.
 */
export function LobbyChat({ roomId, currentUserId }: LobbyChatProps) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const pendingSendAtRef = useRef(0);

  const scrollToBottom = () => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => mergeChatMessage(prev, msg));
      scrollToBottom();
    };
    const onSendFailed = () => {
      if (Date.now() - pendingSendAtRef.current > 4_000) return;
      pendingSendAtRef.current = 0;
      setMessages((prev) => dropLastLocalChatMessage(prev, String(currentUserId)));
    };
    socket.on('chat:message', onMessage);
    socket.on('error', onSendFailed);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('error', onSendFailed);
    };
  }, [currentUserId]);

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || !roomId) return;
    const lastOwn = [...messages]
      .reverse()
      .find((msg) => String(msg.senderId) === String(currentUserId));
    const local = createLocalChatMessage({
      senderId: String(currentUserId),
      username: lastOwn?.username || 'Moi',
      avatar: lastOwn?.avatar,
      content: trimmed,
    });
    setMessages((prev) => [...prev, local]);
    pendingSendAtRef.current = Date.now();
    socket.emit('chat:sendMessage', { roomId, content: trimmed });
    setDraft('');
    scrollToBottom();
  };

  return (
    <div className="glass-card flex h-40 min-h-0 w-full shrink-0 flex-col overflow-hidden sm:h-48 lg:h-auto lg:min-h-0 lg:w-80 lg:flex-none">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold uppercase tracking-wide">Chat du salon</span>
      </div>

      <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="mt-4 text-center text-xs italic text-muted-foreground opacity-50">
            Aucun message. Dites bonjour en attendant !
          </div>
        )}
        {messages.map((msg, index) => {
          const isMe = String(msg.senderId) === String(currentUserId);
          if (msg.isSystem) {
            return (
              <div key={msg.id || index} className="my-2 flex justify-center">
                <span className="rounded-full bg-secondary/50 px-2 py-1 text-[10px] italic text-muted-foreground">
                  {msg.content}
                </span>
              </div>
            );
          }
          return (
            <div
              key={msg.id || index}
              className={cn(
                'flex flex-col text-sm',
                isMe ? 'items-end' : 'items-start',
                isLocalChatMessage(msg) && 'opacity-70',
              )}
            >
              <div className="mb-0.5 flex items-center gap-2">
                {!isMe && (
                  <UserAvatar
                    avatar={msg.avatar || ''}
                    username={msg.username}
                    className="h-4 w-4"
                  />
                )}
                <span
                  className={cn('text-xs font-bold', isMe ? 'text-primary' : 'text-foreground')}
                >
                  {msg.username}
                </span>
                <span className="text-[10px] text-muted-foreground opacity-70">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div
                className={cn(
                  'max-w-[90%] break-words rounded-lg px-3 py-1.5',
                  isMe
                    ? 'rounded-tr-none bg-primary text-primary-foreground'
                    : 'rounded-tl-none bg-secondary text-secondary-foreground',
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-border/50 bg-card/50 p-3">
        <form className="flex gap-2" onSubmit={send}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            aria-label="Message de chat"
            maxLength={200}
            className="h-9 text-sm"
            autoComplete="off"
          />
          <Button
            type="submit"
            variant="default"
            size="icon"
            aria-label="Envoyer"
            className="h-9 w-9 shrink-0"
            disabled={!draft.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
