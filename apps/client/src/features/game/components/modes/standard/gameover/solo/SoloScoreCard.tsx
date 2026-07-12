import { Medal } from 'lucide-react';
import type { GamePlayer, MedalTier, Precision } from '@aniquizz/shared';
import { getMedalMeta } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { XpEarnedBadge } from '../XpEarnedBadge';
import { SoloMasteryBar } from './SoloMasteryBar';

interface SoloScoreCardProps {
  me: GamePlayer | undefined;
  soloMedal: MedalTier;
  isSuccess: boolean;
  score: number;
  maxPossibleScore: number;
  songDifficulties: string[];
  precision?: Precision;
  xpEarned?: number;
}

export function SoloScoreCard({
  me,
  soloMedal,
  isSuccess,
  score,
  maxPossibleScore,
  songDifficulties,
  precision,
  xpEarned,
}: SoloScoreCardProps) {
  const medalMeta = getMedalMeta(soloMedal);

  return (
    <div
      className={cn(
        'relative flex w-full min-w-[17.5rem] flex-col items-center gap-4 rounded-xl border-2 px-6 pb-4 pt-7 shadow-[var(--shadow-card)] transition-colors duration-500 lg:min-w-[20rem]',
        isSuccess
          ? 'overflow-visible border-success/40 bg-card bg-success/5 shadow-[0_0_40px_hsl(var(--success)/0.15)]'
          : 'overflow-hidden border-destructive/30 bg-card shadow-[0_0_40px_hsl(var(--destructive)/0.12)]',
      )}
    >
      {isSuccess ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden rounded-[inherit] bg-gradient-to-b from-success/15 to-transparent"
          aria-hidden
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-destructive/15 via-destructive/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--destructive)/0.08),transparent_55%)]" />
        </div>
      )}

      {medalMeta && (
        <div
          className={cn(
            'absolute -left-2.5 -top-2.5 z-20 flex items-center gap-1 rounded-lg border bg-card px-2.5 py-1 text-xs font-black shadow-lg animate-medal-wiggle',
            medalMeta.textClass,
            medalMeta.borderClass,
          )}
        >
          <Medal className="h-3.5 w-3.5" aria-hidden />
          {medalMeta.label}
        </div>
      )}

      {typeof xpEarned === 'number' && xpEarned > 0 && (
        <XpEarnedBadge xp={xpEarned} className="absolute right-3 top-3 z-20" />
      )}

      <div className="z-10 text-center">
        <h1
          className={cn(
            'font-display text-4xl font-black uppercase italic tracking-tight',
            isSuccess ? 'text-success drop-shadow-[0_0_12px_hsl(var(--success)/0.45)]' : 'text-destructive drop-shadow-[0_0_12px_hsl(var(--destructive)/0.35)]',
          )}
        >
          {isSuccess ? 'Victoire' : 'Défaite'}
        </h1>
      </div>

      <div className="relative z-10 isolate overflow-hidden rounded-full">
        <UserAvatar
          avatar={me?.avatar ?? ''}
          username={me?.username ?? 'Joueur'}
          className={cn(
            'h-32 w-32 border-0 shadow-2xl transition-all duration-500',
            isSuccess
              ? 'ring-4 ring-success shadow-[0_0_24px_hsl(var(--success)/0.35)]'
              : 'ring-4 ring-destructive/50 shadow-[0_0_20px_hsl(var(--destructive)/0.2)] [&_img]:grayscale-[0.5]',
          )}
        />
      </div>

      <div className="z-10 w-full text-center">
        <h2 className="font-display text-5xl font-black tracking-tight">
          {score}{' '}
          <span className="text-lg font-medium text-muted-foreground">/ {maxPossibleScore} pts</span>
        </h2>
      </div>

      <div className="z-10 w-full px-1">
        <SoloMasteryBar
          score={score}
          maxPossibleScore={maxPossibleScore}
          isSuccess={isSuccess}
          soloMedal={soloMedal}
          songDifficulties={songDifficulties}
          precision={precision}
        />
      </div>
    </div>
  );
}
