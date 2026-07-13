import type { LucideIcon } from 'lucide-react';
import { Trophy, ArrowLeft, Play, Settings, AlertTriangle, Music, Loader2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { withWatchedPoolSoundCount, hasWatchedListLink } from '@aniquizz/shared';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { buildRoomSettingBadges, getDifficultyBadge, SETTING_TONE_CLASSES } from '@/features/hub/components/roomSettings';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/features/auth/context/AuthContext';
import { isWatchedSourceBlocked, checkWatchedPoolLaunch, WATCHED_SOURCE_BLOCK_MESSAGE } from '@/features/hub/components/config/watchedSource';
import { useWatchedPoolStats } from '@/features/hub/hooks/useWatchedPoolStats';
import { LobbyRulesTrigger } from '@/features/hub/components/lobby/LobbyRulesDialog';

/** One recap chip in the solo pre-game card. */
function SettingChip({ icon: Icon, label, value, className }: { icon: LucideIcon; label: string; value: string; className: string }) {
  return (
    <div className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold', className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="uppercase tracking-wide opacity-70">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}

interface SoloReadyProps {
  gameSettings?: RoomConfig;
  playerName: string;
  playerAvatar: string;
  user: User | null;
  profile: Profile | null;
  roomId?: string;
  isLaunchStarting?: boolean;
  onStart: () => void;
  onLeave: () => void;
  onOpenSettings: () => void;
}

/**
 * Compact solo pre-game screen. Replaces the multiplayer lobby chrome (code,
 * host role, invites, seats) with a settings recap and a single "Play" action —
 * used both on first launch and when a player quits back from a solo match.
 */
export function SoloReady({
  gameSettings,
  playerName,
  playerAvatar,
  user,
  profile,
  roomId,
  isLaunchStarting = false,
  onStart,
  onLeave,
  onOpenSettings,
}: SoloReadyProps) {
  const difficultyBadge = getDifficultyBadge(gameSettings?.difficulty || []);
  const watchedBlocked = isWatchedSourceBlocked(gameSettings?.soundSelection ?? 'random', user, profile);
  const { stats: watchedStatsRaw } = useWatchedPoolStats({
    roomId,
    soundCount: gameSettings?.soundCount,
    difficulty: gameSettings?.difficulty,
    types: gameSettings?.soundTypes,
    watchedMode: gameSettings?.watchedMode,
    enabled: gameSettings?.soundSelection === 'watched' && hasWatchedListLink(profile ?? {}),
  });
  const watchedStats = withWatchedPoolSoundCount(watchedStatsRaw, gameSettings?.soundCount);
  const poolCheck = checkWatchedPoolLaunch(
    gameSettings?.soundSelection ?? 'random',
    watchedStats,
    gameSettings?.watchedAllowFallback,
  );
  const canPlay = !isLaunchStarting && !watchedBlocked && !poolCheck.blocked;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-2xl flex-col items-center justify-center gap-6 animate-fade-in">
      <div className="glass-card relative w-full overflow-hidden p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" aria-hidden="true" />

        <Button
          variant="ghost"
          size="default"
          onClick={onLeave}
          className="absolute left-4 top-4 z-10 h-10 gap-2 px-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Retour
        </Button>

        <div className="relative z-0 flex flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 font-black uppercase tracking-wider text-primary-foreground shadow-glow">
            <Trophy className="h-5 w-5 fill-current" aria-hidden="true" />
            Standard, Solo
          </div>

          <UserAvatar avatar={playerAvatar} username={playerName} className="h-24 w-24 border-4 border-primary/50 shadow-elevated" />

          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{playerName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prêt à lancer votre blindtest ?</p>
          </div>

          {gameSettings && (
            <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-5">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <SettingChip icon={AlertTriangle} label="Diff" value={difficultyBadge.label} className={difficultyBadge.className} />
                <SettingChip icon={Music} label="Sons" value={String(gameSettings.soundCount)} className={SETTING_TONE_CLASSES.accent} />
                {buildRoomSettingBadges(gameSettings)
                  .filter((spec) => spec.key !== 'sounds')
                  .map((spec) => (
                    <SettingChip key={spec.key} icon={spec.icon} label={spec.label} value={spec.value} className={SETTING_TONE_CLASSES[spec.tone]} />
                  ))}
              </div>
              <LobbyRulesTrigger
                config={gameSettings}
                context={{ lobbyMode: 'solo' }}
                className="ml-auto"
              />
            </div>
          )}

          <div className="mt-2 flex w-full flex-col items-center gap-3">
            <Button
              onClick={onStart}
              variant="glow"
              size="xxl"
              disabled={!canPlay}
              className={cn('w-full max-w-sm gap-3', canPlay && 'animate-pulse-glow')}
            >
              {isLaunchStarting ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  Préparation…
                </>
              ) : (
                <>
                  <Play className="h-6 w-6 fill-current" /> Jouer
                </>
              )}
            </Button>
            {watchedBlocked && (
              <p className="max-w-sm text-center text-sm font-medium text-destructive" role="alert">
                {WATCHED_SOURCE_BLOCK_MESSAGE}
              </p>
            )}
            {!watchedBlocked && poolCheck.blocked && poolCheck.reason && (
              <p className="max-w-sm text-center text-sm font-medium text-destructive" role="alert">
                {poolCheck.reason}
              </p>
            )}
            <Button variant="ghost" onClick={onOpenSettings} className="gap-2 text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" /> Modifier les paramètres
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
