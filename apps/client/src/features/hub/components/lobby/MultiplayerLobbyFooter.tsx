import { Check, Loader2, Play, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { pick } from '@/lib/i18n/text';
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
                {pick('Préparation de la partie…', 'Getting the match ready…')}
              </>
            ) : !hasEnoughPlayers ? (
              <>
                <Users className="h-6 w-6" />{' '}
                {pick(
                  `En attente de joueurs (${playerCount}/2)`,
                  `Waiting for players (${playerCount}/2)`,
                )}
              </>
            ) : (
              <>
                <Play className="h-6 w-6 fill-current" />{' '}
                {pick('Lancer la partie', 'Start the match')}
              </>
            )}
          </Button>
          {isStarting && (
            <p className="text-sm font-medium text-primary animate-pulse" aria-live="polite">
              {pick('La partie démarre…', 'The match is starting…')}
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
                ? pick('Tous les joueurs sont prêts', 'Every player is ready')
                : pick(
                    `${readyGuests.length} / ${guests.length} joueurs prêts`,
                    `${readyGuests.length} / ${guests.length} players ready`,
                  )}
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
            pick('Annuler', 'Cancel')
          ) : (
            <>
              <Check className="h-6 w-6" /> {pick('Je suis prêt !', "I'm ready!")}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
