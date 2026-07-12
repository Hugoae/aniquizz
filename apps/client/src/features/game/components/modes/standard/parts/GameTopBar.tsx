import { LogOut, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileButton } from '@/components/layout/ProfileButton';
import { cn } from '@/lib/utils';
import type { MyProfile } from './types';
interface GameTopBarProps {
  currentRound: number;
  totalRounds: number;
  isGamePaused: boolean;
  isPausePending: boolean;
  pauseVotes: number;
  pauseRequired: number;
  myProfile: MyProfile;
  onShowLeave: () => void;
  onVotePause: () => void;
  onShowProfile: () => void;
}

export function GameTopBar({
  currentRound,
  totalRounds,
  isGamePaused,
  isPausePending,
  pauseVotes,
  pauseRequired,
  myProfile,
  onShowLeave,
  onVotePause,
  onShowProfile,
}: GameTopBarProps) {
  const roundProgress = totalRounds > 0 ? (currentRound / totalRounds) * 100 : 0;

  // Pause is a majority vote — surface the tally so a lone voter gets feedback
  // before the threshold is reached (a real gap today: nothing changed on click).
  const showPauseTally = !isGamePaused && pauseRequired > 1 && pauseVotes > 0;
  const pauseLabel = isGamePaused
    ? 'Reprendre'
    : showPauseTally
      ? `Pause (${pauseVotes}/${pauseRequired})`
      : 'Pause';

  return (
    <header className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onShowLeave} className="gap-2 text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline">Quitter</span>
        </Button>
        <Button
          variant={isGamePaused || isPausePending || showPauseTally ? 'secondary' : 'outline'}
          size="sm"
          onClick={onVotePause}
          className={cn('ml-2 gap-2', isGamePaused && 'border-none bg-warning text-warning-foreground hover:bg-warning/90')}
        >
          {isGamePaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
          {pauseLabel}
        </Button>
      </div>

      <div className="pointer-events-none absolute left-1/2 flex h-full -translate-x-1/2 flex-col items-center justify-center pt-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="eq h-3.5 text-primary" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
            <i></i>
          </span>
          <span className="font-display text-xl font-extrabold leading-none tracking-tight gradient-text">AniQuizz</span>
        </div>
        <div className="pointer-events-auto flex w-64 items-center justify-center gap-3 text-[10px] text-muted-foreground">          <span className="font-mono font-bold tabular-nums" aria-live="polite">
            Round {currentRound}/{totalRounds}
          </span>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-md bg-secondary"
            role="progressbar"
            aria-valuenow={currentRound}
            aria-valuemin={0}
            aria-valuemax={totalRounds}
            aria-label="Progression de la partie"
          >
            <div className="h-full bg-gradient-primary transition-all duration-1000" style={{ width: `${roundProgress}%` }} />
          </div>
        </div>
      </div>

      <ProfileButton
        username={myProfile.username}
        avatar={myProfile.avatar}
        xp={myProfile.xp}
        onClick={onShowProfile}
      />
    </header>
  );
}