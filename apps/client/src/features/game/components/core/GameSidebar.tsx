import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, MessageSquare, Send, Check, Flame, WifiOff } from 'lucide-react';
import type { GamePlayer } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { socket } from '@/lib/socket';
import { computeRanks, rankAccent, rankNeutralAccent, activeMatchPlayers, hasRankingSpread } from '@/features/game/utils/ranking';

interface ChatMessage {
  id: string;
  senderId: string;
  username: string;
  avatar?: string;
  content: string;
  timestamp: number;
  isSystem?: boolean;
}

interface GameSidebarProps {
  players: GamePlayer[];
  isCollapsed: boolean;
  onToggle: () => void;
  onPlayerClick?: (playerId: string | number) => void;
  hideScores?: boolean;
  /** Current match phase; drives the guessing-time "answered" indicator. */
  phase?: 'loading' | 'guessing' | 'revealed' | 'ended';
  roomId: string;
  /** Canonical userId of the local player (never socket.id). */
  currentUserId?: string;
  /** Bumped to briefly shake the panel (e.g. when the roster is already open). */
  attentionSignal?: number;
}

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function GameSidebar({ players, isCollapsed, onToggle, onPlayerClick, hideScores, phase, roomId, currentUserId, attentionSignal }: GameSidebarProps) {
  const meId = currentUserId ?? socket.id;
  const [activeTab, setActiveTab] = useState<'players' | 'chat'>('players');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  const isCollapsedRef = useRef(isCollapsed);

  const roster = activeMatchPlayers(players);
  const sortedPlayers = hideScores ? roster : [...roster].sort((a, b) => b.score - a.score);
  const ranks = hideScores ? null : computeRanks(roster);
  const rankingEstablished = !hideScores && hasRankingSpread(roster);

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    activeTabRef.current = activeTab;
    isCollapsedRef.current = isCollapsed;
    if (activeTab === 'chat' && !isCollapsed) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [activeTab, isCollapsed]);

  // Briefly shake when asked to grab attention (roster already open).
  useEffect(() => {
    if (!attentionSignal) return;
    setIsShaking(true);
    const t = setTimeout(() => setIsShaking(false), 500);
    return () => clearTimeout(t);
  }, [attentionSignal]);

  useEffect(() => {
    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (activeTabRef.current !== 'chat' || isCollapsedRef.current) {
        setUnreadCount((prev) => prev + 1);
      } else {
        scrollToBottom();
      }
    };
    socket.on('chat:message', handleNewMessage);
    return () => {
      socket.off('chat:message', handleNewMessage);
    };
  }, []);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatMessage.trim() || !roomId) return;
    socket.emit('chat:sendMessage', { roomId, content: chatMessage });
    setChatMessage('');
  };

  return (
    <aside
      className={cn(
        'relative flex h-full shrink-0 flex-col border-l border-border bg-card/30 transition-all duration-300',
        isCollapsed ? 'w-12' : 'w-80 shadow-2xl',
        isShaking && 'animate-shake',
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={isCollapsed ? 'Ouvrir le panneau' : 'Fermer le panneau'}
        aria-expanded={!isCollapsed}
        className="absolute -left-3 top-4 z-10 h-6 w-6 rounded-lg border border-border bg-card hover:bg-secondary"
      >
        {isCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {isCollapsed && unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
          </span>
        )}
      </Button>

      {!isCollapsed && (
        <>
          <div className="border-b border-border p-2">
            <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
              <Button variant={activeTab === 'players' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('players')} className="flex-1 gap-2 rounded-md">
                <Users className="h-4 w-4" />
                Joueurs
              </Button>
              <Button variant={activeTab === 'chat' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('chat')} className="relative flex-1 gap-2 rounded-md">
                <MessageSquare className="h-4 w-4" />
                Chat
                {unreadCount > 0 && activeTab !== 'chat' && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 animate-in zoom-in items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {activeTab === 'players' ? (
            <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
              {sortedPlayers.map((player, index) => {
                const isMe = String(player.id) === String(meId);
                const rank = ranks?.get(String(player.id)) ?? index + 1;
                const hasAnswered = phase === 'guessing' && player.hasAnswered === true;
                const streak = player.streak ?? 0;
                const isDisconnected = player.isConnected === false;
                return (
                  <div
                    key={player.id}
                    onClick={() => onPlayerClick?.(player.id)}
                    className={cn(
                      'glass-card cursor-pointer p-3 transition-all hover:bg-secondary/50',
                      isMe && 'border-primary/50',
                      isDisconnected && 'opacity-50 grayscale',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                          rankingEstablished ? rankAccent(rank) : rankNeutralAccent(),
                        )}
                      >
                        #{rankingEstablished ? rank : '-'}
                      </span>
                      <div className="relative shrink-0">
                        <UserAvatar avatar={player.avatar} username={player.username} className="h-9 w-9" />
                        {isDisconnected && (
                          <span
                            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-muted"
                            title="Déconnecté"
                            aria-label="Déconnecté"
                          >
                            <WifiOff className="h-2.5 w-2.5 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-sm font-medium transition-colors hover:text-primary">
                          <span className="truncate">
                            {player.username} {isMe && '(Moi)'}
                          </span>
                          <RoleBadge role={player.role} />
                        </div>
                      </div>
                      {hasAnswered && (
                        <span
                          className="flex h-5 w-5 shrink-0 animate-in zoom-in items-center justify-center rounded-full border border-primary/50 bg-primary/20"
                          title="A répondu"
                          aria-label="A répondu"
                        >
                          <Check className="h-3 w-3 text-primary" />
                        </span>
                      )}
                      {!hideScores && streak >= 3 && (
                        <span
                          className="flex shrink-0 items-center gap-0.5 rounded-md border border-warning/50 bg-warning/10 px-1.5 py-0.5"
                          title={`Série de ${streak} bonnes réponses`}
                          aria-label={`Série de ${streak}`}
                        >
                          <Flame className={cn('h-3 w-3 fill-warning text-warning', streak >= 5 && 'animate-pulse')} />
                          <span className="text-[10px] font-black italic text-warning">{streak}</span>
                        </span>
                      )}
                      {!hideScores && <div className="text-lg font-bold text-primary">{player.score}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
                {messages.length === 0 && (
                  <div className="mt-4 text-center text-xs italic text-muted-foreground opacity-50">Aucun message. Soyez le premier à parler !</div>
                )}
                {messages.map((msg, index) => {
                  const isMe = String(msg.senderId) === String(meId);
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id || index} className="my-2 flex justify-center">
                        <span className="rounded-full bg-secondary/50 px-2 py-1 text-[10px] italic text-muted-foreground">{msg.content}</span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id || index} className={cn('flex flex-col text-sm', isMe ? 'items-end' : 'items-start')}>
                      <div className="mb-0.5 flex items-center gap-2">
                        {!isMe && <UserAvatar avatar={msg.avatar || ''} username={msg.username} className="h-4 w-4" />}
                        <span className={cn('text-xs font-bold', isMe ? 'text-primary' : 'text-foreground')}>{msg.username}</span>
                        <span className="text-[10px] text-muted-foreground opacity-70">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div
                        className={cn(
                          'max-w-[90%] break-words rounded-lg px-3 py-1.5',
                          isMe ? 'rounded-tr-none bg-primary text-primary-foreground' : 'rounded-tl-none bg-secondary text-secondary-foreground',
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              <div className="border-t border-border bg-card/50 p-3">
                <form className="flex gap-2" onSubmit={handleSendMessage}>
                  <Input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Message…" aria-label="Message de chat" className="h-9 text-sm" autoComplete="off" />
                  <Button type="submit" variant="default" size="icon" aria-label="Envoyer" className="h-9 w-9 shrink-0" disabled={!chatMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
