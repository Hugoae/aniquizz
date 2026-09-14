import { Check, Loader2, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';

interface MultiplayerLobbyFooterProps {
  isHost: boolean;
  canStart: boolean;
  isStarting: boolean;
  hasEnoughPlayers: boolean;
  playerCount: number;
  sourceBlocked: boolean;
  watchedBlockReason: string | null | undefined;
  guests: LobbyPlayer[];
  readyGuests: LobbyPlayer[];
  allGuestsReady: boolean;
  isGameRunning: boolean;
  me: LobbyPlayer | undefined;
  onStartGame: () => void;
  onToggleReady: () => void;
}

export function MultiplayerLobbyFooter({
  isHost,
  canStart,
  isStarting,
  hasEnoughPlayers,
  playerCount,
  sourceBlocked,
  watchedBlockReason,
  guests,
  readyGuests,
  allGuestsReady,
  isGameRunning,
  me,
  onStartGame,
  onToggleReady,
}: MultiplayerLobbyFooterProps) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
      {isHost ? (
        <>
          <Button
            onClick={onStartGame}
            variant={hasEnoughPlayers ? 'glow' : 'secondary'}
            size="xxl"
            disabled={!canStart || isStarting}
            className={cn(
              'w-full max-w-md gap-3',
              canStart && !isStarting ? 'animate-pulse-glow' : 'opacity-70 grayscale',
            )}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                Préparation de la partie…
              </>
            ) : !hasEnoughPlayers ? (
              <>
                <Users className="h-6 w-6" /> En attente de joueurs ({playerCount}/2)
              </>
            ) : (
              <>
                <Play className="h-6 w-6 fill-current" /> Lancer la partie
              </>
            )}
          </Button>
          {isStarting && (
            <p className="text-sm font-medium text-primary animate-pulse" aria-live="polite">
              La partie démarre…
            </p>
          )}
          {sourceBlocked && !isStarting && watchedBlockReason && (
            <p className="max-w-md text-center text-sm font-medium text-destructive" role="alert">
              {watchedBlockReason}
            </p>
          )}
          {!isStarting && !sourceBlocked && guests.length > 0 && !isGameRunning && (
            <span
              aria-live="polite"
              className={cn(
                'text-xs font-medium',
                allGuestsReady ? 'text-success' : 'text-muted-foreground',
              )}
            >
              {allGuestsReady
                ? 'Tous les joueurs sont prêts'
                : `${readyGuests.length} / ${guests.length} joueurs prêts`}
            </span>
          )}
        </>
      ) : (
        <Button
          onClick={onToggleReady}
          variant={me?.isReady ? 'secondary' : 'glow'}
          size="xxl"
          disabled={isStarting || (isGameRunning && me?.isInGame)}
          className="w-full max-w-md justify-center gap-3"
        >
          {me?.isReady ? (
            'Annuler'
          ) : (
            <>
              <Check className="h-6 w-6" /> Je suis prêt !
            </>
          )}
        </Button>
      )}
    </div>
  );
}
