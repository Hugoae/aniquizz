import { useMemo, useState } from 'react';
import { Users, Search, Lock, ListMusic, AlertTriangle, Clock, Target, Mic2, Shuffle, Play, Trophy, RefreshCw } from 'lucide-react';
import type { RoomListItem } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useFriends } from '@/features/friends/FriendsContext';
import { getDifficultyBadge } from '@/features/hub/components/roomSettings';

interface RoomListProps {
  rooms: RoomListItem[];
  onJoin: (roomId: string) => void;
  onRefresh: () => void;
}

type FilterType = 'all' | 'public' | 'private' | 'friends';

const FILTER_BUTTONS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'public', label: 'Publics' },
  { id: 'private', label: 'Privés' },
  { id: 'friends', label: 'Amis' },
];

const ModeBadge = () => (
  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider shadow-sm">
    <Trophy className="w-3 h-3 fill-current" /> STD
  </span>
);

export function RoomList({ rooms, onJoin, onRefresh }: RoomListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const { friends } = useFriends();

  // Rooms currently hosting at least one friend (from live presence).
  const friendRoomIds = useMemo(
    () => new Set(friends.map((f) => f.roomId).filter((id): id is string => !!id)),
    [friends],
  );

  const isJoinable = (room: RoomListItem) => room.status === 'waiting' && room.players < room.maxPlayers;

  // Filter, then sort: joinable first, friend rooms bumped up, playing/full last.
  const visibleRooms = useMemo(() => {
    const filtered = rooms.filter((room) => {
      if (filter === 'public') return !room.isPrivate;
      if (filter === 'private') return room.isPrivate;
      if (filter === 'friends') return friendRoomIds.has(room.id);
      return true;
    });
    const rank = (room: RoomListItem) => (isJoinable(room) ? 0 : 2) + (friendRoomIds.has(room.id) ? 0 : 1);
    return [...filtered].sort((a, b) => rank(a) - rank(b));
  }, [rooms, filter, friendRoomIds]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div role="group" aria-label="Filtrer les salons" className="bg-secondary/30 p-1 rounded-lg flex gap-1 border border-border/50">
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              type="button"
              aria-pressed={filter === btn.id}
              onClick={() => setFilter(btn.id)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                filter === btn.id
                  ? 'bg-background shadow-lg text-primary border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {rooms.length} salon{rooms.length > 1 ? 's' : ''} disponible{rooms.length > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Rafraîchir la liste"
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {visibleRooms.map((room) => {
          const isFull = room.players >= room.maxPlayers;
          const isPlaying = room.status === 'playing';
          const s = room.settings;
          const diffBadge = getDifficultyBadge(s.difficulty || []);

          return (
            <div
              key={room.id}
              className="group relative glass-card p-5 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:translate-y-[-2px] overflow-hidden rounded-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <div className="flex items-center justify-between md:justify-start gap-4">
                    <div className="flex items-center gap-2">
                      <ModeBadge />
                      <h3 className="font-black text-xl truncate text-foreground group-hover:text-primary transition-colors tracking-tight">
                        {room.name}
                      </h3>
                    </div>

                    {room.isPrivate && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Privé
                      </span>
                    )}
                    {isPlaying && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <Play className="w-3 h-3 fill-current" /> En cours
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/50 bg-secondary/30 text-xs font-bold text-muted-foreground">
                      <ListMusic className="w-3.5 h-3.5 text-accent" />
                      <span className="text-foreground">{s.soundCount || 10}</span>
                    </div>

                    <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold', diffBadge.className)}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{diffBadge.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-warning/20 bg-warning/10 text-xs font-bold text-warning">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{s.guessDuration || 15}s</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-accent/20 bg-accent/10 text-xs font-bold text-accent">
                      <Target className="w-3.5 h-3.5" />
                      <span className="capitalize">{s.precision === 'exact' ? 'Exact' : 'Franchise'}</span>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                      <Mic2 className="w-3.5 h-3.5" />
                      <span className="capitalize">{s.responseType === 'mix' ? 'MIX' : s.responseType}</span>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-aqua/20 bg-aqua/10 text-xs font-bold text-aqua">
                      <Shuffle className="w-3.5 h-3.5" />
                      <span className="capitalize">
                        {s.soundSelection === 'watched' ? 'Watched List' : 'Aléatoire'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hébergé par</div>
                      <div className="text-sm font-bold">{room.host}</div>
                    </div>
                    <UserAvatar avatar={room.hostAvatar} username={room.host} className="h-10 w-10 border-2 border-border/50" />
                    <div className="text-left md:hidden">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hôte</div>
                      <div className="text-sm font-bold">{room.host}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 min-w-[100px]">
                    <div className={cn('flex items-center gap-1.5 text-xs font-bold mb-1', isFull ? 'text-destructive' : 'text-success')}>
                      <Users className="h-3.5 w-3.5" />
                      {room.players} / {room.maxPlayers}
                    </div>
                    <Button
                      variant="glow"
                      size="sm"
                      className={cn('w-full transition-all font-bold rounded-lg', isFull && 'opacity-50')}
                      disabled={isFull}
                      onClick={() => onJoin(room.id)}
                    >
                      {isFull ? 'COMPLET' : isPlaying ? 'REGARDER' : 'REJOINDRE'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleRooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-secondary/5 rounded-2xl border border-border/50 border-dashed animate-fade-in">
          <div className="bg-secondary/20 p-4 rounded-full mb-4">
            <Search className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-lg font-bold">Aucun salon trouvé</p>
          <p className="text-sm opacity-50">Essayez de modifier les filtres ou créez votre propre partie !</p>
        </div>
      )}
    </div>
  );
}
