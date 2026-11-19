import { useMemo, useState } from 'react';
import { Users, Search, Lock, Play, RefreshCw } from 'lucide-react';
import type { RoomListItem } from '@aniquizz/shared';
import { playlistSourceDisplayName } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useFriends } from '@/features/friends/FriendsContext';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';
import { SettingChipItem, SettingChipList } from '@/features/hub/components/SettingChip';
import { GameModeBadge } from '@/features/hub/components/GameModeBadge';
import { TestMatchMark } from '@/features/hub/components/config/TestMatchOption';
import { isRoomListJoinable, roomJoinButtonLabel } from '@/features/hub/components/roomListJoin';
import { usePublishedPlaylists } from '@/features/hub/hooks/usePublishedPlaylists';
import { formatAppNumber } from '@/lib/i18n/format';
import { pick } from '@/lib/i18n/text';

interface RoomListProps {
  rooms: RoomListItem[];
  onJoin: (roomId: string) => void;
  onRefresh: () => void;
}

type FilterType = 'all' | 'public' | 'private' | 'friends';

const FILTER_BUTTONS: { id: FilterType; label: string }[] = [
  {
    id: 'all',
    get label() {
      return pick('Tous', 'All');
    },
  },
  {
    id: 'public',
    get label() {
      return pick('Publics', 'Public');
    },
  },
  {
    id: 'private',
    get label() {
      return pick('Privés', 'Private');
    },
  },
  {
    id: 'friends',
    get label() {
      return pick('Amis', 'Friends');
    },
  },
];

export function RoomList({ rooms, onJoin, onRefresh }: RoomListProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const { friends } = useFriends();
  const { playlists } = usePublishedPlaylists(true);

  const friendRoomIds = useMemo(
    () => new Set(friends.map((f) => f.roomId).filter((id): id is string => !!id)),
    [friends],
  );

  const visibleRooms = useMemo(() => {
    const filtered = rooms.filter((room) => {
      if (filter === 'public') return !room.isPrivate;
      if (filter === 'private') return room.isPrivate;
      if (filter === 'friends') return friendRoomIds.has(room.id);
      return true;
    });
    const rank = (room: RoomListItem) =>
      (isRoomListJoinable(room) ? 0 : 2) + (friendRoomIds.has(room.id) ? 0 : 1);
    return [...filtered].sort((a, b) => rank(a) - rank(b));
  }, [rooms, filter, friendRoomIds]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label={pick('Filtrer les salons', 'Filter rooms')}
          className="bg-secondary/30 p-1 rounded-lg flex gap-1 border border-border/50"
        >
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
            {pick(
              `${formatAppNumber(rooms.length)} salon${rooms.length > 1 ? 's' : ''} disponible${rooms.length > 1 ? 's' : ''}`,
              rooms.length === 1
                ? `${formatAppNumber(rooms.length)} room available`
                : `${formatAppNumber(rooms.length)} rooms available`,
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label={pick('Rafraîchir la liste', 'Refresh the list')}
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
          const settingChips = buildLobbySettingChips({
            ...s,
            soundSelection: s.soundSelection as 'random' | 'mix' | 'watched' | 'playlist',
            playlistName: playlistSourceDisplayName(playlists, s),
          });

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
                      <GameModeBadge
                        gameType={s.gameType}
                        speedBonusEnabled={Boolean(s.speedBonusEnabled)}
                        compact
                      />
                      <h3 className="font-black text-xl truncate text-foreground group-hover:text-primary transition-colors tracking-tight">
                        {room.name}
                      </h3>
                      {s.testMatch ? <TestMatchMark /> : null}
                    </div>

                    {room.isPrivate && (
                      <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 uppercase tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Privé
                      </span>
                    )}
                    {isPlaying && (
                      <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <Play className="w-3 h-3 fill-current" /> En cours
                      </span>
                    )}
                  </div>

                  <SettingChipList>
                    {settingChips.map((spec) => (
                      <SettingChipItem key={spec.key} spec={spec} />
                    ))}
                  </SettingChipList>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        {pick('Hébergé par', 'Hosted by')}
                      </div>
                      <div className="text-sm font-bold">{room.host}</div>
                    </div>
                    <UserAvatar
                      avatar={room.hostAvatar}
                      username={room.host}
                      className="h-10 w-10 border-2 border-border/50"
                    />
                    <div className="text-left md:hidden">
                      <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        {pick('Hôte', 'Host')}
                      </div>
                      <div className="text-sm font-bold">{room.host}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 min-w-[100px]">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 text-xs font-bold mb-1',
                        isFull ? 'text-destructive' : 'text-success',
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {room.players} / {room.maxPlayers}
                    </div>
                    <Button
                      variant="glow"
                      size="sm"
                      className={cn(
                        'w-full transition-all font-bold rounded-lg',
                        !isRoomListJoinable(room) && 'opacity-50',
                      )}
                      disabled={!isRoomListJoinable(room)}
                      onClick={() => onJoin(room.id)}
                    >
                      {roomJoinButtonLabel(room)}
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
          <p className="text-lg font-bold">{pick('Aucun salon trouvé', 'No rooms found')}</p>
          <p className="text-sm opacity-50">
            {pick(
              'Essayez de modifier les filtres ou créez votre propre partie !',
              'Try different filters, or create your own match.',
            )}
          </p>
        </div>
      )}
    </div>
  );
}
