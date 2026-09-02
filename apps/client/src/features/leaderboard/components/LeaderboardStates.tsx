import { AlertCircle, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="glass-card h-36 animate-pulse bg-secondary/30" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="glass-card h-14 animate-pulse bg-secondary/30" />
      ))}
    </div>
  );
}

export function LeaderboardEmptyState({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 rounded-2xl border-dashed px-6 py-16 text-center">
      <Music2 className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
      <p className="font-semibold text-foreground">{LEADERBOARD_COPY.emptyTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{LEADERBOARD_COPY.emptyHint}</p>
      <Button type="button" onClick={onPlay}>
        {LEADERBOARD_COPY.playCta}
      </Button>
    </div>
  );
}

export function LeaderboardErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {LEADERBOARD_COPY.retry}
      </Button>
    </div>
  );
}
