import { Trophy } from 'lucide-react';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';

interface LeaderboardHeroProps {
  eligibleCount: number | null;
}

export function LeaderboardHero({ eligibleCount }: LeaderboardHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-warning/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
            {LEADERBOARD_COPY.eyebrow}
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight gradient-text md:text-4xl">
            {LEADERBOARD_COPY.title}
          </h1>
          <p className="text-pretty text-sm text-muted-foreground md:text-base">
            {LEADERBOARD_COPY.subtitle}
          </p>
        </div>

        {eligibleCount != null && (
          <div className="glass-card rounded-xl px-3 py-2.5 text-center min-w-[5.5rem]">
            <div className="text-xl font-black tabular-nums text-warning">
              {eligibleCount.toLocaleString('fr-FR')}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {LEADERBOARD_COPY.rankedCount}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
