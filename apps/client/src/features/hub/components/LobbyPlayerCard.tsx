import { Crown, X, Bot } from 'lucide-react';
import type { UserRole } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { AddFriendButton } from '@/features/friends/AddFriendButton';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';

export interface LobbyPlayer {
  id: string | number;
  name: string;
  avatar: string;
  isReady: boolean;
  isHost: boolean;
  isInGame?: boolean;
  isBot?: boolean;
  role?: UserRole;
  level?: number;
  /** Whether this player has a linked AniList account (Watched-mode gating). */
  hasAniList?: boolean;
}

interface LobbyPlayerCardProps {
  player: LobbyPlayer;
  isMe: boolean;
  isSolo: boolean;
  /** The viewer is the host and can promote/kick other players. */
  canManage: boolean;
  /** Show an "AniList requis" badge (Watched mode needs this player linked). */
  needsAniList?: boolean;
  onTransferHost: (targetId: string | number) => void;
  onKick: (targetId: string | number) => void;
}

/** Whether a player id refers to a simulated bot (no friend action for those). */
const isBotId = (id: string | number) => typeof id === 'string' && id.startsWith('bot-');

export function LobbyPlayerCard({ player, isMe, isSolo, canManage, needsAniList, onTransferHost, onKick }: LobbyPlayerCardProps) {
  const { isInGame, isReady, isHost, isBot, level } = player;

  return (
    <div
      className={cn(
        'group relative flex w-full animate-in fade-in slide-in-from-bottom-2 flex-col items-center gap-3 rounded-xl border p-6 transition-all duration-300',
        isSolo && 'max-w-xs scale-105 shadow-elevated',
        isInGame
          ? 'border-warning/40 bg-warning/5 shadow-[0_0_18px_hsl(var(--warning)/0.15)]'
          : isReady
            ? 'border-success/30 bg-success/5 shadow-[0_0_18px_hsl(var(--success)/0.12)]'
            : 'glass-card border-border/50 hover:border-primary/30 hover-lift',
      )}
    >
      {/* Host management controls (promote / kick), shown on hover/focus. */}
      {canManage && !isHost && (
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onTransferHost(player.id)}
            aria-label={`Nommer ${player.name} hôte`}
            className={cn('rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-warning', FOCUS_RING)}
          >
            <Crown className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onKick(player.id)}
            aria-label={`Exclure ${player.name} du salon`}
            className={cn('rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive', FOCUS_RING)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {!isMe && typeof player.id === 'string' && (
        <div className="absolute left-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <AddFriendButton userId={player.id} isBot={isBot ?? isBotId(player.id)} compact />
        </div>
      )}

      {isHost && (
        <div className="absolute -top-3 z-10 flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-warning-foreground shadow-lg">
          <Crown className="h-3 w-3 fill-current" aria-hidden="true" /> HÔTE
        </div>
      )}

      <div className="relative">
        <UserAvatar
          avatar={player.avatar}
          username={player.name}
          className={cn(
            'h-20 w-20 border-4 shadow-xl',
            isInGame ? 'border-warning' : isReady ? 'border-success' : 'border-border/60',
          )}
        />
        {typeof level === 'number' && !isBot && (
          <span
            className="absolute -bottom-1 left-1/2 flex h-6 min-w-[2.25rem] -translate-x-1/2 items-center justify-center gap-0.5 rounded-full border-2 border-card bg-gradient-to-br from-primary to-accent px-1.5 text-[11px] font-black tabular-nums text-primary-foreground shadow-md"
            title={`Niveau ${level}`}
          >
            <span className="text-[8px] font-bold uppercase opacity-80">Nv</span>
            {level}
          </span>
        )}
      </div>

      <div className="w-full text-center">
        <h3 className={cn('flex items-center justify-center gap-1.5 truncate text-lg font-bold', isMe && 'text-primary')}>
          <span className="truncate">
            {player.name} {isMe && '(Moi)'}
          </span>
          {isBot ? (
            <span className="inline-flex items-center gap-1 rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <Bot className="h-3 w-3" aria-hidden="true" /> Bot
            </span>
          ) : (
            <RoleBadge role={player.role} />
          )}
        </h3>
        {needsAniList && !isBot && (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-warning">
            AniList requis
          </p>
        )}
      </div>

      <div
        className={cn(
          'mt-1 w-full rounded-md border py-1.5 text-center text-xs font-bold uppercase tracking-wide transition-colors',
          isHost
            ? 'border-transparent text-muted-foreground opacity-60'
            : isInGame
              ? 'animate-pulse border-warning bg-warning text-warning-foreground'
              : isReady
                ? 'border-success/20 bg-success/15 text-success'
                : 'border-transparent bg-secondary/50 text-muted-foreground',
        )}
      >
        {isHost
          ? isInGame
            ? 'Joue…'
            : 'Administre'
          : isInGame
            ? 'En jeu'
            : isReady
              ? 'Prêt'
              : 'En attente…'}
      </div>
    </div>
  );
}
