import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Users, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
// socket
import { socket } from '@/services/socket';

interface Player {
  id: string | number;
  name: string;
  avatar: string;
  score: number;
  rank: number;
  streak?: number;
  // level retiré
  competitiveRank?: string;
  competitiveTier?: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

interface GameSidebarProps {
  players: Player[];
  isCollapsed: boolean;
  onToggle: () => void;
  onPlayerClick?: (playerId: string | number) => void;
  hideScores?: boolean; 
  roomId: string;
}

const rankColors: Record<string, string> = {
  bronze: 'text-amber-600 bg-amber-600/20',
  silver: 'text-gray-400 bg-gray-400/20',
  gold: 'text-yellow-500 bg-yellow-500/20',
  platine: 'text-cyan-400 bg-cyan-400/20',
  diamond: 'text-blue-400 bg-blue-400/20',
  masterweeb: 'text-purple-500 bg-purple-500/20',
};

const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export function GameSidebar({ players, isCollapsed, onToggle, onPlayerClick, hideScores, roomId }: GameSidebarProps) {
  const [activeTab, setActiveTab] = useState<'players' | 'chat'>('players');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const activeTabRef = useRef(activeTab);
  const isCollapsedRef = useRef(isCollapsed);

  const sortedPlayers = hideScores ? players : [...players].sort((a, b) => b.score - a.score);

  useEffect(() => {
      activeTabRef.current = activeTab;
      if (activeTab === 'chat' && !isCollapsed) {
          setUnreadCount(0);
      }
  }, [activeTab, isCollapsed]);

  useEffect(() => {
      isCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);

  useEffect(() => {
      const handleChatHistory = (data: { messages: ChatMessage[] }) => {
          setMessages(data.messages);
          scrollToBottom();
      };

      const handleNewMessage = (msg: ChatMessage) => {
          setMessages(prev => [...prev, msg]);
          
          if (activeTabRef.current !== 'chat' || isCollapsedRef.current) {
              setUnreadCount(prev => prev + 1);
          } else {
              scrollToBottom();
          }
      };

      socket.on('chat_history', handleChatHistory);
      socket.on('new_message', handleNewMessage);

      return () => {
          socket.off('chat_history', handleChatHistory);
          socket.off('new_message', handleNewMessage);
      };
  }, []);

  useEffect(() => {
      if (activeTab === 'chat' && !isCollapsed) {
          scrollToBottom();
          setUnreadCount(0);
      }
  }, [activeTab, isCollapsed]);

  const scrollToBottom = () => {
      setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!chatMessage.trim() || !roomId) return;
      socket.emit('send_message', { roomId, message: chatMessage });
      setChatMessage('');
  };

  return (
    <aside
      className={cn(
        "border-l border-border bg-card/30 flex flex-col transition-all duration-300 relative",
        isCollapsed ? "w-12" : "w-80"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -left-3 top-4 h-6 w-6 rounded-full bg-card border border-border z-10"
      >
        {isCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        
        {isCollapsed && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
        )}
      </Button>

      {!isCollapsed && (
        <>
          <div className="p-2 border-b border-border">
            <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
              <Button
                variant={activeTab === 'players' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('players')}
                className="flex-1 gap-2"
              >
                <Users className="h-4 w-4" />
                Joueurs
              </Button>
              
              <Button
                variant={activeTab === 'chat' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('chat')}
                className="flex-1 gap-2 relative"
              >
                <MessageSquare className="h-4 w-4" />
                Chat
                {unreadCount > 0 && activeTab !== 'chat' && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-in zoom-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
              </Button>
            </div>
          </div>

          {activeTab === 'players' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  onClick={() => onPlayerClick?.(player.id)}
                  className={cn(
                    "glass-card p-3 transition-all cursor-pointer hover:bg-secondary/50",
                    String(player.id) === String(socket.id) && "border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-gray-300 text-black" :
                      index === 2 ? "bg-amber-700 text-white" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      #{index + 1}
                    </span>

                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm hover:text-primary transition-colors">
                        {player.name} {String(player.id) === String(socket.id) && "(Moi)"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {/* Level retiré */}
                        {player.competitiveRank && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium",
                            rankColors[player.competitiveRank.toLowerCase()] || 'text-muted-foreground bg-secondary'
                          )}>
                            {player.competitiveRank} {player.competitiveTier || ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {!hideScores && (
                      <div className="text-lg font-bold text-primary">
                        {player.score}
                      </div>
                    )}
                    </div>
                  </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs italic mt-4 opacity-50">
                        Aucun message. Soyez le premier à parler !
                    </div>
                )}
                {messages.map((msg, index) => {
                    const isMe = msg.userId === socket.id;
                    return (
                        <div key={msg.id || index} className={cn("text-sm flex flex-col", isMe ? "items-end" : "items-start")}>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={cn("font-bold text-xs", isMe ? "text-primary" : "text-foreground")}>
                                    {msg.username}
                                </span>
                                <span className="text-[10px] text-muted-foreground opacity-70">
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                            <div className={cn(
                                "px-3 py-1.5 rounded-lg max-w-[90%] break-words",
                                isMe 
                                    ? "bg-primary text-primary-foreground rounded-tr-none" 
                                    : "bg-secondary text-secondary-foreground rounded-tl-none"
                            )}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-3 border-t border-border bg-card/50">
                <form 
                    className="flex gap-2"
                    onSubmit={handleSendMessage}
                >
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Message..."
                    className="h-9 text-sm"
                    autoComplete="off"
                  />
                  <Button type="submit" variant="default" size="icon" className="h-9 w-9 shrink-0" disabled={!chatMessage.trim()}>
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