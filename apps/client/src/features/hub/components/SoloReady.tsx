import { Trophy, Zap, ArrowLeft, Play, Settings, Loader2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { withWatchedPoolSoundCount, hasWatchedListLink } from '@aniquizz/shared';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/features/auth/context/AuthContext';
import { isWatchedSourceBlocked, checkWatchedPoolLaunch, WATCHED_SOURCE_BLOCK_MESSAGE } from '@/features/hub/components/config/watchedSource';
import { useWatchedPoolStats } from '@/features/hub/hooks/useWatchedPoolStats';
import { LobbyRulesTrigger } from '@/features/hub/components/lobby/LobbyRulesDialog';
import { SoloLobbyRecap } from '@/features/hub/components/lobby/SoloLobbyRecap';
import { soloLobbyModeBadge } from '@/features/hub/components/lobby/soloLobbyRecapGroups';

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
 * Solo pre-game screen — settings recap and launch action.
 * Used on first solo launch and when returning from a solo match.
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
  const modeBadge = gameSettings ? soloLobbyModeBadge(gameSettings) : 'Standard · Solo';
  const ModeIcon = gameSettings?.gameType === 'sprint' ? Zap : Trophy;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--aqua) / 0.12), transparent 55%)',
        }}
      />

      <Header />

      <main id="main-content" className="relative flex flex-1 flex-col">
        <div className="container flex flex-1 flex-col px-4 pb-8 pt-20 md:px-6 md:pb-10 md:pt-24">
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6">
            <Button
              variant="ghost"
              onClick={onLeave}
              className="w-fit gap-2 pl-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour
            </Button>

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-glow">
                <ModeIcon className="h-4 w-4 fill-current" aria-hidden="true" />
                {modeBadge}
              </div>

              <UserAvatar
                avatar={playerAvatar}
                username={playerName}
                className="h-20 w-20 border-4 border-primary/40 shadow-elevated md:h-24 md:w-24"
              />

              <div className="space-y-1">
                <h1 className="text-2xl font-bold uppercase tracking-tight md:text-3xl">{playerName}</h1>
                <p className="text-sm text-muted-foreground">Prêt à lancer votre blindtest ?</p>
              </div>
            </div>

            <div className="glass-card flex flex-col gap-5 p-5 md:p-6">
              {gameSettings && (
                <>
                  <SoloLobbyRecap config={gameSettings} />
                  <div className="flex justify-center border-t border-border/60 pt-4">
                    <LobbyRulesTrigger config={gameSettings} context={{ lobbyMode: 'solo' }} subtle />
                  </div>
                </>
              )}

              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={onStart}
                  variant="glow"
                  size="xxl"
                  disabled={!canPlay}
                  className={cn('w-full gap-3', canPlay && 'animate-pulse-glow')}
                >
                  {isLaunchStarting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                      Préparation…
                    </>
                  ) : (
                    <>
                      <Play className="h-6 w-6 fill-current" aria-hidden="true" />
                      Jouer
                    </>
                  )}
                </Button>

                {watchedBlocked && (
                  <p className="text-center text-sm font-medium text-destructive" role="alert">
                    {WATCHED_SOURCE_BLOCK_MESSAGE}
                  </p>
                )}
                {!watchedBlocked && poolCheck.blocked && poolCheck.reason && (
                  <p className="text-center text-sm font-medium text-destructive" role="alert">
                    {poolCheck.reason}
                  </p>
                )}

                <Button variant="outline" onClick={onOpenSettings} className="gap-2 rounded-lg">
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Modifier les paramètres
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
