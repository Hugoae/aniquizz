import type { LucideIcon } from 'lucide-react';
import { Trophy, ArrowLeft, Play, Settings, AlertTriangle, Music, Loader2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { buildRoomSettingBadges, getDifficultyBadge, SETTING_TONE_CLASSES } from '@/features/hub/components/roomSettings';

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
export function SoloReady({ gameSettings, playerName, playerAvatar, isLaunchStarting = false, onStart, onLeave, onOpenSettings }: SoloReadyProps) {
  const difficultyBadge = getDifficultyBadge(gameSettings?.difficulty || []);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-2xl flex-col items-center justify-center gap-6 animate-fade-in">
      <div className="glass-card relative w-full overflow-hidden p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" aria-hidden="true" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onLeave}
          aria-label="Retour"
          className="absolute left-4 top-4 h-9 w-9 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative flex flex-col items-center gap-5 text-center">
          <div className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 font-black uppercase tracking-wider text-primary-foreground shadow-glow">
            <Trophy className="h-5 w-5 fill-current" aria-hidden="true" />
            Standard · Solo
          </div>

          <UserAvatar avatar={playerAvatar} username={playerName} className="h-24 w-24 border-4 border-primary/50 shadow-elevated" />

          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{playerName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prêt à lancer votre blindtest ?</p>
          </div>

          {gameSettings && (
            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border/50 pt-5">
              <SettingChip icon={AlertTriangle} label="Diff" value={difficultyBadge.label} className={difficultyBadge.className} />
              <SettingChip icon={Music} label="Sons" value={String(gameSettings.soundCount)} className={SETTING_TONE_CLASSES.accent} />
              {buildRoomSettingBadges(gameSettings)
                .filter((spec) => spec.key !== 'sounds')
                .map((spec) => (
                  <SettingChip key={spec.key} icon={spec.icon} label={spec.label} value={spec.value} className={SETTING_TONE_CLASSES[spec.tone]} />
                ))}
            </div>
          )}

          <div className="mt-2 flex w-full flex-col items-center gap-3">
            <Button
              onClick={onStart}
              variant="glow"
              size="xxl"
              disabled={isLaunchStarting}
              className={cn('w-full max-w-sm gap-3', !isLaunchStarting && 'animate-pulse-glow')}
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
            <Button variant="ghost" onClick={onOpenSettings} className="gap-2 text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" /> Modifier les paramètres
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
