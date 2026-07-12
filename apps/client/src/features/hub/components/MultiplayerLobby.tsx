import { useMemo, useState, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Trophy, Check, Settings, ArrowLeft, Copy, Play,
  Eye, EyeOff, AlertTriangle, Users, Bot, Loader2, Music2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { RoomConfig, GameStatus } from '@aniquizz/shared';
import { withWatchedPoolSoundCount } from '@aniquizz/shared';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { InviteFriendsButton } from '@/features/friends/InviteFriendsButton';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { LobbyPlayerCard, type LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';
import { LobbySeat } from '@/features/hub/components/LobbySeat';
import { LobbyChat } from '@/features/hub/components/LobbyChat';
import { buildRoomSettingBadges, getDifficultyBadge, SETTING_TONE_CLASSES } from '@/features/hub/components/roomSettings';
import { checkWatchedLobby, checkWatchedPoolLaunch, watchedPoolModeLabel, resolveWatchedPoolBanner, watchedPoolBannerVariantClasses } from '@/features/hub/components/config/watchedSource';
import { useWatchedPoolStats } from '@/features/hub/hooks/useWatchedPoolStats';
import { LobbyRulesTrigger } from '@/features/hub/components/lobby/LobbyRulesDialog';

export type { LobbyPlayer };

/** Display order: host first, then other humans, then bots (regardless of join order). */
const seatRank = (p: LobbyPlayer) => (p.isHost ? 0 : p.isBot ? 2 : 1);

/** A single room-setting chip in the lobby header (design tokens only). */
function SettingChip({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: string; className: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold', className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="uppercase tracking-wide opacity-70">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}

interface MultiplayerLobbyProps {
  roomName: string;
  players: LobbyPlayer[];
  maxPlayers: number;
  isHost: boolean;
  currentUserId: string | number;
  gameSettings?: RoomConfig;
  roomCode: string;
  gameStatus?: GameStatus;
  /** Host clicked start — waiting for server ack / playlist build. */
  isLaunchStarting?: boolean;
  /** Show "add bots" for DEV builds or ADMIN hosts (server-gated on `dev:add_bots`). */
  canAddBots?: boolean;
  onStartGame: () => void;
  onToggleReady: () => void;
  onLeave: () => void;
  onOpenSettings: () => void;
  onTransferHost: (targetId: string | number) => void;
  onKickPlayer: (targetId: string | number) => void;
  onAddBots: (count: number) => void;
  /** Refetches Watched pool stats when lobby roster changes. */
  watchedPlayersKey?: string;
  /** Host-only partial settings patch (silent auto-clear of fallback opt-in). */
  onPatchRoomSettings?: (patch: Partial<RoomConfig>, silent?: boolean) => void;
}

export function MultiplayerLobby({
  roomName,
  players,
  maxPlayers,
  isHost,
  currentUserId,
  gameSettings,
  roomCode,
  gameStatus = 'waiting',
  isLaunchStarting = false,
  canAddBots = false,
  onStartGame,
  onToggleReady,
  onLeave,
  onOpenSettings,
  onTransferHost,
  onKickPlayer,
  onAddBots,
  watchedPlayersKey,
  onPatchRoomSettings,
}: MultiplayerLobbyProps) {
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [hostTransferTarget, setHostTransferTarget] = useState<string | number | null>(null);
  const [kickTarget, setKickTarget] = useState<LobbyPlayer | null>(null);
  const [showCode, setShowCode] = useState(false);

  const humanCount = useMemo(() => players.filter((p) => !p.isBot).length, [players]);

  const me = players.find((p) => String(p.id) === String(currentUserId));
  const isStarting = isLaunchStarting || gameStatus === 'starting';
  const isGameRunning = gameStatus === 'playing' || gameStatus === 'paused' || isStarting;

  const guests = players.filter((p) => !p.isHost);
  const readyGuests = guests.filter((p) => p.isReady);
  const allGuestsReady = guests.every((p) => p.isReady);

  const hasEnoughPlayers = players.length >= 2;
  const watchedCheck = checkWatchedLobby(
    gameSettings?.soundSelection ?? 'random',
    gameSettings?.watchedMode ?? 'union',
    players,
  );
  const { stats: watchedStatsRaw, loading: watchedStatsLoading } = useWatchedPoolStats({
    roomId: roomCode,
    soundCount: gameSettings?.soundCount,
    difficulty: gameSettings?.difficulty,
    types: gameSettings?.soundTypes,
    watchedMode: gameSettings?.watchedMode,
    enabled: isHost && gameSettings?.soundSelection === 'watched',
    refreshKey: watchedPlayersKey,
  });
  const watchedStats = withWatchedPoolSoundCount(watchedStatsRaw, gameSettings?.soundCount);
  const poolCheck = checkWatchedPoolLaunch(
    gameSettings?.soundSelection ?? 'random',
    watchedStats,
    gameSettings?.watchedAllowFallback,
  );
  const watchedBlocked = isHost && (watchedCheck.blocked || poolCheck.blocked);
  const watchedBlockReason = watchedCheck.blocked ? watchedCheck.reason : poolCheck.reason;
  const canStart = isHost && hasEnoughPlayers && allGuestsReady && !isGameRunning && !watchedBlocked;

  const prevPoolInsufficientRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isHost || watchedStatsLoading || !watchedStats) return;
    const wasInsufficient = prevPoolInsufficientRef.current;
    const nowInsufficient = watchedStats.insufficient;
    if (wasInsufficient === true && nowInsufficient === false) {
      toast.success('Plus besoin de compléter avec l\'aléatoire — le pool AniList est maintenant suffisant.');
      if (gameSettings?.watchedAllowFallback) {
        onPatchRoomSettings?.({ watchedAllowFallback: false }, true);
      }
    }
    prevPoolInsufficientRef.current = nowInsufficient;
  }, [
    watchedStats,
    watchedStatsLoading,
    isHost,
    gameSettings?.watchedAllowFallback,
    onPatchRoomSettings,
  ]);

  const showWatchedPoolBanner =
    isHost && gameSettings?.soundSelection === 'watched' && !watchedCheck.blocked;
  const watchedModeLabel = watchedPoolModeLabel(
    watchedStats?.watchedMode ?? gameSettings?.watchedMode,
  );
  const watchedPoolBanner = resolveWatchedPoolBanner(
    watchedStats,
    watchedStatsLoading,
    watchedModeLabel,
    gameSettings?.watchedAllowFallback,
  );

  const freeSlots = Math.max(0, maxPlayers - players.length);
  const isFull = freeSlots === 0;
  const fillRatio = maxPlayers > 0 ? players.length / maxPlayers : 0;

  const orderedPlayers = useMemo(
    () => [...players].sort((a, b) => seatRank(a) - seatRank(b)),
    [players],
  );
  const playerIds = useMemo(() => players.map((p) => p.id), [players]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success('Code copié dans le presse-papier !');
  };

  const handleConfirmTransfer = () => {
    if (hostTransferTarget) {
      onTransferHost(hostTransferTarget);
      setHostTransferTarget(null);
    }
  };

  const handleConfirmKick = () => {
    if (kickTarget) {
      onKickPlayer(kickTarget.id);
      setKickTarget(null);
    }
  };

  const difficultyBadge = getDifficultyBadge(gameSettings?.difficulty || []);

  const seats = useMemo(() => Array.from({ length: freeSlots }), [freeSlots]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-88px)] w-full max-w-6xl flex-col gap-4 animate-fade-in">
      {/* HEADER */}
      <div className="glass-card flex shrink-0 flex-col gap-4 p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeaveDialog(true)}
              aria-label="Quitter le salon"
              className="h-10 w-10 shrink-0 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="mb-1 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 font-black uppercase tracking-wider text-primary-foreground shadow-glow">
                  <Trophy className="h-5 w-5 fill-current" aria-hidden="true" />
                  Standard
                </div>
              </div>

              <h1 className="flex flex-wrap items-center gap-3 text-3xl font-black uppercase tracking-tight">
                {roomName}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/40 px-3 py-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Code :</span>
                  <span className="min-w-[80px] text-center font-mono text-lg font-bold tracking-widest text-foreground">
                    {showCode ? roomCode : '••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCode((v) => !v)}
                    aria-label={showCode ? 'Masquer le code' : 'Afficher le code'}
                    aria-pressed={showCode}
                    className={cn('ml-1 rounded text-muted-foreground transition-colors hover:text-foreground', FOCUS_RING)}
                  >
                    {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={copyRoomCode}
                    aria-label="Copier le code du salon"
                    className={cn('ml-1 rounded text-muted-foreground transition-colors hover:text-primary', FOCUS_RING)}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isHost && <InviteFriendsButton excludeIds={playerIds} />}
            {isHost && (
              <Button variant="secondary" onClick={onOpenSettings} className="gap-2">
                <Settings className="h-4 w-4" />
                Paramètres
              </Button>
            )}
          </div>
        </div>

        {/* Settings chips */}
        {gameSettings && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
            <div className="flex flex-wrap gap-2">
              <SettingChip icon={AlertTriangle} label="Diff" value={difficultyBadge.label} className={difficultyBadge.className} />
              {buildRoomSettingBadges(gameSettings).map((spec) => (
                <SettingChip key={spec.key} icon={spec.icon} label={spec.label} value={spec.value} className={SETTING_TONE_CLASSES[spec.tone]} />
              ))}
            </div>
            <LobbyRulesTrigger
              config={gameSettings}
              context={{
                lobbyMode: 'multi',
                playerCount: humanCount,
              }}
              className="ml-auto"
            />
          </div>
        )}
      </div>

      {showWatchedPoolBanner && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-xl border px-4 py-3 text-sm',
            watchedPoolBannerVariantClasses(watchedPoolBanner.variant),
          )}
          role="status"
          aria-live="polite"
        >
          <Music2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {watchedPoolBanner.variant === 'loading' ? (
            <span>Analyse du pool AniList…</span>
          ) : watchedPoolBanner.variant === 'empty' ? (
            <span>
              Aucun son jouable ({watchedPoolBanner.modeLabel}) pour ces filtres.
            </span>
          ) : watchedPoolBanner.variant === 'fallback' ? (
            <span>
              <b>{watchedPoolBanner.count}</b> son{watchedPoolBanner.count > 1 ? 's' : ''} jouable
              {watchedPoolBanner.count > 1 ? 's' : ''} ({watchedPoolBanner.modeLabel}) —{' '}
              <b>Complétion aléatoire activée</b> pour {watchedPoolBanner.soundCount} manches
            </span>
          ) : watchedPoolBanner.variant === 'insufficient' ? (
            <span>
              <b>{watchedPoolBanner.count}</b> son{watchedPoolBanner.count > 1 ? 's' : ''} jouable
              {watchedPoolBanner.count > 1 ? 's' : ''} ({watchedPoolBanner.modeLabel}) —{' '}
              <b>Insuffisant</b> pour {watchedPoolBanner.soundCount} manches
            </span>
          ) : (
            <span>
              <b>{watchedPoolBanner.count}</b> son{watchedPoolBanner.count > 1 ? 's' : ''} jouable
              {watchedPoolBanner.count > 1 ? 's' : ''} ({watchedPoolBanner.modeLabel}) — <b>Suffisant</b>
            </span>
          )}
        </div>
      )}

      {/* BODY: players grid + chat */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/40 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent">
          {/* Players-panel toolbar: capacity + equalizer identity + dev bots. */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span aria-live="polite" className="text-sm font-bold">
                <span className={cn(hasEnoughPlayers ? 'text-foreground' : 'text-warning')}>{players.length}</span>
                <span className="text-muted-foreground"> / {maxPlayers} joueurs</span>
              </span>
              {/* Equalizer motif: fades in as the room fills. */}
              <span
                aria-hidden="true"
                className="eq ml-1 h-3 text-primary transition-opacity duration-500"
                style={{ opacity: 0.25 + fillRatio * 0.75 }}
              >
                <i /><i /><i /><i />
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
                  needsWatchedList={watchedCheck.badgeIds.has(player.id)}
                  onTransferHost={setHostTransferTarget}
                  onKick={() => setKickTarget(player)}
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

      {/* FOOTER ACTION */}
      <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
        {isHost ? (
          <>
            <Button
              onClick={onStartGame}
              variant={hasEnoughPlayers ? 'glow' : 'secondary'}
              size="xxl"
              disabled={!canStart || isStarting}
              className={cn('w-full max-w-md gap-3', canStart && !isStarting ? 'animate-pulse-glow' : 'opacity-70 grayscale')}
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  Préparation de la partie…
                </>
              ) : !hasEnoughPlayers ? (
                <>
                  <Users className="h-6 w-6" /> En attente de joueurs ({players.length}/2)
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
            {watchedBlocked && !isStarting && watchedBlockReason && (
              <p className="max-w-md text-center text-sm font-medium text-destructive" role="alert">
                {watchedBlockReason}
              </p>
            )}
            {!isStarting && !watchedBlocked && guests.length > 0 && !isGameRunning && (
              <span
                aria-live="polite"
                className={cn('text-xs font-medium', allGuestsReady ? 'text-success' : 'text-muted-foreground')}
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

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le salon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {isHost && players.length > 1
                ? "Vous êtes l'hôte. Si vous quittez, un nouvel hôte sera désigné automatiquement."
                : 'Vous allez être déconnecté de ce salon.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowLeaveDialog(false); onLeave(); }} className="bg-destructive hover:bg-destructive/90">
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!hostTransferTarget} onOpenChange={() => setHostTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transférer le rôle d'hôte ?</AlertDialogTitle>
            <AlertDialogDescription>Ce joueur deviendra l'hôte du salon et gérera les paramètres.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!kickTarget} onOpenChange={() => setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exclure ce joueur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {kickTarget?.name} sera retiré du salon. Il pourra le rejoindre à nouveau avec le code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmKick} className="bg-destructive hover:bg-destructive/90">
              Exclure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
