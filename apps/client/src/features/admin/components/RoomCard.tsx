import type { RefObject } from 'react';
import { Bot, Clock, Copy, Eye, EyeOff, Ghost, Lock, Music2, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { adminApi, type AdminRoom } from '@/lib/adminApi';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { LiveClock } from './LiveClock';
import {
  connectedHumans,
  formatDifficulties,
  formatOpenSince,
  isPlaying,
  MODE_LABELS,
  RESPONSE_LABELS,
  SELECTION_LABELS,
  statusMeta,
  type PendingConfirm,
} from './roomsPanelModel';

function ConfigBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground">
      {children}
    </span>
  );
}

export function RoomCard({
  room,
  highlighted,
  highlightRef,
  passwordVisible,
  onCopy,
  onToggleReveal,
  onSpectate,
  onPending,
  onOpenProfile,
}: {
  room: AdminRoom;
  highlighted: boolean;
  highlightRef: RefObject<HTMLDivElement>;
  passwordVisible: boolean;
  onCopy: (text: string, msg: string) => void;
  onToggleReveal: (id: string) => void;
  onSpectate: (id: string) => void;
  onPending: (pending: PendingConfirm) => void;
  onOpenProfile: (player: { userId: string; connected: boolean }) => void;
}) {
  const meta = statusMeta(room.status);
  const botCount = room.playerCount - room.humanCount;
  const ghost = connectedHumans(room) === 0;
  const sortedPlayers = [...room.players].sort((a, b) => Number(b.isHost) - Number(a.isHost));
  const showPw = passwordVisible;
  const endsAt = room.progress?.endsAt ?? null;

  return (
    <div
      ref={highlighted ? highlightRef : undefined}
      className={cn(
        'glass-card p-4 space-y-3 transition-all animate-in fade-in-0 duration-300',
        highlighted && 'ring-2 ring-primary/60',
        ghost && 'opacity-80',
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 font-semibold">
            {room.isPrivate && <Lock className="h-3.5 w-3.5 text-warning" />}
            {room.name}
            <button
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              title="Copier le code du salon"
              onClick={() => void onCopy(room.id, 'Code du salon copié.')}
            >
              #{room.id} <Copy className="h-3 w-3" />
            </button>
            <Badge className={cn('gap-1.5', meta.className)}>
              <span
                className={cn('h-1.5 w-1.5 rounded-full', meta.dot, meta.pulse && 'animate-pulse')}
              />
              {meta.label}
            </Badge>
            {ghost && (
              <Badge className="gap-1 bg-warning/15 text-warning">
                <Ghost className="h-3 w-3" /> Fantôme
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {room.playerCount}/{room.maxPlayers} joueurs — {room.humanCount} humain(s)
              {botCount > 0 && ` — ${botCount} bot(s)`}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> ouvert depuis{' '}
              <LiveClock render={(now) => formatOpenSince(room.createdAt, now)} />
            </span>
          </div>

          {/* Config badges */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <ConfigBadge>{MODE_LABELS[room.settings.mode] ?? room.settings.mode}</ConfigBadge>
            {room.settings.speedBonusEnabled && (
              <ConfigBadge>
                <Zap className="h-3 w-3" /> Vitesse
              </ConfigBadge>
            )}
            <ConfigBadge>
              <Music2 className="h-3 w-3" /> {room.settings.soundCount} sons
            </ConfigBadge>
            <ConfigBadge>{formatDifficulties(room.settings.difficulty)}</ConfigBadge>
            <ConfigBadge>{room.settings.guessDuration}s / round</ConfigBadge>
            <ConfigBadge>
              {RESPONSE_LABELS[room.settings.responseType] ?? room.settings.responseType}
            </ConfigBadge>
            <ConfigBadge>
              {SELECTION_LABELS[room.settings.soundSelection] ?? room.settings.soundSelection}
            </ConfigBadge>
            {room.isPrivate && (
              <ConfigBadge>
                <Lock className="h-3 w-3" />
                {showPw ? room.password || '(réservé admin)' : '••••••'}
                <button
                  className="hover:text-foreground"
                  title={showPw ? 'Masquer' : 'Afficher le mot de passe'}
                  onClick={() => onToggleReveal(room.id)}
                >
                  {showPw ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                {showPw && room.password && (
                  <button
                    className="hover:text-foreground"
                    title="Copier le mot de passe"
                    onClick={() => void onCopy(room.password, 'Mot de passe copié.')}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </ConfigBadge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!isPlaying(room)}
            onClick={() => onSpectate(room.id)}
          >
            {ADMIN_COPY.spectator.open}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!isPlaying(room)}
            onClick={() =>
              onPending({
                title: `Terminer la partie de "${room.name}" ?`,
                description: 'La partie en cours sera arrêtée et les joueurs renvoyés au salon.',
                confirmLabel: 'Terminer',
                action: () => adminApi.endMatch(room.id),
                successMsg: 'Partie terminée.',
              })
            }
          >
            Terminer
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() =>
              onPending({
                title: `Fermer le salon "${room.name}" ?`,
                description:
                  'Le salon sera définitivement fermé et tous les joueurs en seront expulsés.',
                confirmLabel: 'Fermer',
                destructive: true,
                action: () => adminApi.closeRoom(room.id),
                successMsg: 'Salon fermé.',
              })
            }
          >
            Fermer
          </Button>
        </div>
      </div>

      {/* Live match progress */}
      {isPlaying(room) && room.progress && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              Round {room.progress.currentRound}/{room.progress.totalRounds}
              {room.progress.phase && (
                <span className="ml-2 text-muted-foreground">
                  {room.progress.phase === 'guessing'
                    ? '· manche'
                    : room.progress.phase === 'reveal'
                      ? '· révélation'
                      : '· intro'}
                </span>
              )}
            </span>
            {endsAt !== null && (
              <span className="text-muted-foreground">
                <LiveClock render={(now) => `${Math.ceil(Math.max(0, endsAt - now) / 1000)}s`} />
              </span>
            )}
          </div>
          {room.progress.anime && (
            <div className="truncate text-sm">
              {room.progress.anime}
              {room.progress.title && (
                <span className="text-muted-foreground"> — {room.progress.title}</span>
              )}
            </div>
          )}
          <Progress
            value={
              room.progress.totalRounds
                ? (room.progress.currentRound / room.progress.totalRounds) * 100
                : 0
            }
            className="h-2"
          />
        </div>
      )}

      {/* Players */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {sortedPlayers.map((p) => (
          <div
            key={p.userId}
            role={p.isBot ? undefined : 'button'}
            tabIndex={p.isBot ? undefined : 0}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-secondary/50 px-2 py-1 text-xs transition-colors',
              !p.isBot && 'cursor-pointer hover:bg-secondary',
            )}
            onClick={
              p.isBot
                ? undefined
                : () => onOpenProfile({ userId: p.userId, connected: p.isConnected })
            }
            onKeyDown={
              p.isBot
                ? undefined
                : (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenProfile({ userId: p.userId, connected: p.isConnected });
                    }
                  }
            }
            title={p.isBot ? undefined : 'Voir le profil'}
          >
            <span className="relative">
              <UserAvatar avatar={p.avatar} username={p.username} className="h-6 w-6" />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background',
                  p.isConnected ? 'bg-success' : 'bg-muted-foreground/40',
                )}
              />
            </span>
            <span className={cn('font-medium', !p.isConnected && 'opacity-60')}>{p.username}</span>
            {p.isHost && <Badge className="bg-primary/20 text-primary">Hôte</Badge>}
            {p.isBot && (
              <Badge className="gap-1 bg-accent/15 text-accent">
                <Bot className="h-3 w-3" /> Bot
              </Badge>
            )}
            <span className="text-muted-foreground">{p.score} pts</span>
            <button
              className="text-destructive hover:text-destructive/80"
              title="Expulser"
              onClick={(e) => {
                e.stopPropagation();
                onPending({
                  title: `Expulser ${p.username} ?`,
                  description: `${p.username} sera retiré du salon "${room.name}".`,
                  confirmLabel: 'Expulser',
                  destructive: true,
                  action: () => adminApi.kick(room.id, p.userId),
                  successMsg: 'Joueur expulsé.',
                });
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
