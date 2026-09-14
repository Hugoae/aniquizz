import { useMemo, useState, useEffect, useRef } from 'react';
import { Music2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RoomConfig, GameStatus } from '@aniquizz/shared';
import {
  withPlaylistPoolSoundCount,
  withWatchedPoolSoundCount,
  hasPlaylistSource,
  playlistSourceDisplayName,
  toWatchedPoolStatsView,
} from '@aniquizz/shared';

import { cn } from '@/lib/utils';
import { type LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';
import {
  checkWatchedLobby,
  checkWatchedPoolLaunch,
  watchedPoolModeLabel,
  resolveWatchedPoolBanner,
  watchedPoolBannerVariantClasses,
  WATCHED_ANILIST_BLOCKED_MESSAGE,
  WATCHED_ANILIST_STALE_MESSAGE,
} from '@/features/hub/components/config/watchedSource';
import { checkPlaylistPoolLaunch } from '@/features/hub/components/config/playlistSource';
import { useWatchedPoolStats } from '@/features/hub/hooks/useWatchedPoolStats';
import { usePlaylistPoolStats } from '@/features/hub/hooks/usePlaylistPoolStats';
import { usePublishedPlaylists } from '@/features/hub/hooks/usePublishedPlaylists';
import { MultiplayerLobbyHeader } from '@/features/hub/components/lobby/MultiplayerLobbyHeader';
import { MultiplayerLobbyRoster } from '@/features/hub/components/lobby/MultiplayerLobbyRoster';
import { MultiplayerLobbyFooter } from '@/features/hub/components/lobby/MultiplayerLobbyFooter';
import { MultiplayerLobbyDialogs } from '@/features/hub/components/lobby/MultiplayerLobbyDialogs';
import { HUB_COPY } from '@/features/hub/copy/hubCopy';

export type { LobbyPlayer };

/** Display order: host first, then other humans, then bots (regardless of join order). */
const seatRank = (p: LobbyPlayer) => (p.isHost ? 0 : p.isBot ? 2 : 1);

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
    gameSettings?.playlistWatched,
  );
  const { stats: watchedStatsRaw, loading: watchedStatsLoading } = useWatchedPoolStats({
    roomId: roomCode,
    soundCount: gameSettings?.soundCount,
    difficulty: gameSettings?.difficulty,
    types: gameSettings?.soundTypes,
    watchedMode: gameSettings?.watchedMode,
    precision: gameSettings?.precision,
    enabled: isHost && gameSettings?.soundSelection === 'watched',
    refreshKey: watchedPlayersKey,
  });
  const watchedStats = withWatchedPoolSoundCount(watchedStatsRaw, gameSettings?.soundCount);
  const poolCheck = checkWatchedPoolLaunch(
    gameSettings?.soundSelection ?? 'random',
    watchedStats,
    gameSettings?.watchedAllowFallback,
    gameSettings?.responseType,
    gameSettings?.precision,
  );
  const { playlists } = usePublishedPlaylists(gameSettings?.soundSelection === 'playlist');
  const playlistName = playlistSourceDisplayName(playlists, gameSettings ?? {});
  const { stats: playlistStatsRaw, loading: playlistStatsLoading } = usePlaylistPoolStats({
    playlistId: gameSettings?.playlistId,
    decadePlaylistId: gameSettings?.decadePlaylistId,
    roomId: roomCode,
    soundCount: gameSettings?.soundCount,
    difficulty: gameSettings?.difficulty,
    types: gameSettings?.soundTypes,
    playlistWatched: gameSettings?.playlistWatched,
    watchedMode: gameSettings?.watchedMode,
    precision: gameSettings?.precision,
    allowFallback: gameSettings?.watchedAllowFallback,
    enabled:
      isHost &&
      gameSettings?.soundSelection === 'playlist' &&
      hasPlaylistSource(gameSettings ?? {}),
    refreshKey: watchedPlayersKey,
  });
  const playlistStats =
    withPlaylistPoolSoundCount(playlistStatsRaw, gameSettings?.soundCount) ?? null;
  const playlistPoolCheck = checkPlaylistPoolLaunch(
    gameSettings?.soundSelection ?? 'random',
    gameSettings?.responseType ?? 'mix',
    playlistStats,
    gameSettings?.watchedAllowFallback,
    gameSettings?.precision,
  );
  const sourceBlocked =
    isHost && (watchedCheck.blocked || poolCheck.blocked || playlistPoolCheck.blocked);
  const watchedBlockReason = watchedCheck.blocked
    ? watchedCheck.reason
    : poolCheck.blocked
      ? poolCheck.reason
      : playlistPoolCheck.reason;
  const canStart = isHost && hasEnoughPlayers && allGuestsReady && !isGameRunning && !sourceBlocked;

  const prevPoolInsufficientRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isHost || watchedStatsLoading || !watchedStats) return;
    const wasInsufficient = prevPoolInsufficientRef.current;
    const nowInsufficient = watchedStats.insufficient;
    if (wasInsufficient === true && nowInsufficient === false) {
      toast.success(HUB_COPY.toasts.poolNowSufficient);
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

  const playlistOverlayOn =
    gameSettings?.soundSelection === 'playlist' && Boolean(gameSettings.playlistWatched);
  const overlayWatchedStats =
    playlistOverlayOn && playlistStats ? toWatchedPoolStatsView(playlistStats) : null;
  const showWatchedPoolBanner =
    isHost &&
    !watchedCheck.blocked &&
    (gameSettings?.soundSelection === 'watched' || playlistOverlayOn);
  const watchedModeLabel = watchedPoolModeLabel(
    (gameSettings?.soundSelection === 'watched'
      ? watchedStats?.watchedMode
      : overlayWatchedStats?.watchedMode) ?? gameSettings?.watchedMode,
  );
  const bannerWatchedStats =
    gameSettings?.soundSelection === 'watched' ? watchedStats : overlayWatchedStats;
  const bannerWatchedLoading =
    gameSettings?.soundSelection === 'watched' ? watchedStatsLoading : playlistStatsLoading;
  const watchedPoolBanner = resolveWatchedPoolBanner(
    bannerWatchedStats,
    bannerWatchedLoading,
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
    toast.success(HUB_COPY.copied);
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

  const settingChips = useMemo(
    () => (gameSettings ? buildLobbySettingChips({ ...gameSettings, playlistName }) : []),
    [gameSettings, playlistName],
  );

  const seats = useMemo(() => Array.from({ length: freeSlots }), [freeSlots]);

  return (
    <div className="mx-auto flex h-dvh min-h-0 w-full max-w-6xl flex-col gap-4 animate-fade-in px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      <MultiplayerLobbyHeader
        roomName={roomName}
        gameType={gameSettings?.gameType}
        roomCode={roomCode}
        showCode={showCode}
        onToggleCode={() => setShowCode((v) => !v)}
        onCopyCode={copyRoomCode}
        isHost={isHost}
        playerIds={playerIds}
        onLeaveClick={() => setShowLeaveDialog(true)}
        onOpenSettings={onOpenSettings}
        settingChips={settingChips}
        gameSettings={gameSettings}
        humanCount={humanCount}
        playlistName={playlistName}
      />

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
          <div className="min-w-0 space-y-1">
            {watchedPoolBanner.variant === 'loading' ? (
              <span>Analyse du pool AniList…</span>
            ) : watchedPoolBanner.variant === 'empty' ? (
              <span>
                {bannerWatchedStats?.listError === 'anilist_blocked'
                  ? WATCHED_ANILIST_BLOCKED_MESSAGE
                  : `Aucun son jouable (${watchedPoolBanner.modeLabel}) pour ces filtres.`}
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
                {watchedPoolBanner.count > 1 ? 's' : ''} ({watchedPoolBanner.modeLabel}) —{' '}
                <b>Suffisant</b>
              </span>
            )}
            {bannerWatchedStats?.listError === 'anilist_blocked' &&
              (bannerWatchedStats.playableSongs ?? 0) > 0 && (
                <span className="block text-warning">{WATCHED_ANILIST_STALE_MESSAGE}</span>
              )}
          </div>
        </div>
      )}

      <MultiplayerLobbyRoster
        roomCode={roomCode}
        currentUserId={currentUserId}
        isHost={isHost}
        canAddBots={canAddBots}
        gameStatus={gameStatus}
        isFull={isFull}
        hasEnoughPlayers={hasEnoughPlayers}
        fillRatio={fillRatio}
        maxPlayers={maxPlayers}
        players={players}
        orderedPlayers={orderedPlayers}
        seats={seats}
        playerIds={playerIds}
        watchedBadgeIds={watchedCheck.badgeIds}
        onAddBots={onAddBots}
        onTransferHost={setHostTransferTarget}
        onKick={setKickTarget}
      />

      <MultiplayerLobbyFooter
        isHost={isHost}
        canStart={canStart}
        isStarting={isStarting}
        hasEnoughPlayers={hasEnoughPlayers}
        playerCount={players.length}
        sourceBlocked={Boolean(sourceBlocked)}
        watchedBlockReason={watchedBlockReason}
        guests={guests}
        readyGuests={readyGuests}
        allGuestsReady={allGuestsReady}
        isGameRunning={isGameRunning}
        me={me}
        onStartGame={onStartGame}
        onToggleReady={onToggleReady}
      />

      <MultiplayerLobbyDialogs
        showLeave={showLeaveDialog}
        onShowLeaveChange={setShowLeaveDialog}
        isHost={isHost}
        playerCount={players.length}
        onLeave={onLeave}
        transferTarget={hostTransferTarget}
        onTransferOpenChange={() => setHostTransferTarget(null)}
        onConfirmTransfer={handleConfirmTransfer}
        kickTarget={kickTarget}
        onKickOpenChange={() => setKickTarget(null)}
        onConfirmKick={handleConfirmKick}
      />
    </div>
  );
}
