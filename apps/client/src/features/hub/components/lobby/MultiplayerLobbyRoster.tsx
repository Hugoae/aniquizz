import { Bot, Users } from 'lucide-react';
import type { GameStatus } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InviteFriendsButton } from '@/features/friends/InviteFriendsButton';
import { LobbyPlayerCard, type LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';
import { LobbySeat } from '@/features/hub/components/LobbySeat';
import { LobbyChat } from '@/features/hub/components/LobbyChat';

interface MultiplayerLobbyRosterProps {
  roomCode: string;
  currentUserId: string | number;
  isHost: boolean;
  canAddBots: boolean;
  gameStatus: GameStatus;
  isFull: boolean;
  hasEnoughPlayers: boolean;
  fillRatio: number;
  maxPlayers: number;
  players: LobbyPlayer[];
  orderedPlayers: LobbyPlayer[];
  seats: unknown[];
  playerIds: Array<string | number>;
  watchedBadgeIds: Set<string | number>;
  onAddBots: (count: number) => void;
  onTransferHost: (targetId: string | number) => void;
  onKick: (player: LobbyPlayer) => void;
}

export function MultiplayerLobbyRoster({
  roomCode,
  currentUserId,
  isHost,
  canAddBots,
  gameStatus,
  isFull,
  hasEnoughPlayers,
  fillRatio,
  maxPlayers,
  players,
  orderedPlayers,
  seats,
  playerIds,
  watchedBadgeIds,
  onAddBots,
  onTransferHost,
  onKick,
}: MultiplayerLobbyRosterProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/40 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span aria-live="polite" className="text-sm font-bold">
              <span className={cn(hasEnoughPlayers ? 'text-foreground' : 'text-warning')}>
                {players.length}
              </span>
              <span className="text-muted-foreground"> / {maxPlayers} joueurs</span>
            </span>
            <span
              aria-hidden="true"
              className="eq ml-1 h-3 text-primary transition-opacity duration-500"
              style={{ opacity: 0.25 + fillRatio * 0.75 }}
            >
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
          {canAddBots && isHost && gameStatus === 'waiting' && !isFull && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddBots(1)}
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Bot className="h-3.5 w-3.5" /> Ajouter un bot
            </Button>
          )}
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orderedPlayers.map((player) => (
              <LobbyPlayerCard
                key={player.id}
                player={player}
                isMe={String(player.id) === String(currentUserId)}
                isSolo={false}
                canManage={isHost}
                needsWatchedList={watchedBadgeIds.has(player.id)}
                onTransferHost={onTransferHost}
                onKick={() => onKick(player)}
              />
            ))}
            {seats.map((_, index) => (
              <LobbySeat key={`seat-${index}`} variant={isHost && index === 0 ? 'invite' : 'empty'}>
                {isHost && index === 0 ? <InviteFriendsButton excludeIds={playerIds} /> : undefined}
              </LobbySeat>
            ))}
          </div>
        </div>
      </div>

      <LobbyChat roomId={roomCode} currentUserId={currentUserId} />
    </div>
  );
}
