import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GAME_COPY } from '@/features/game/copy/gameCopy';

interface MatchLoadingOverlayProps {
  loadingCount: number;
  firstClipReady: boolean;
  amIHost: boolean | undefined;
  onCancel: () => void;
  onLeaveSalon: () => void;
}

export function MatchLoadingOverlay({
  loadingCount,
  firstClipReady,
  amIHost,
  onCancel,
  onLeaveSalon,
}: MatchLoadingOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-40 flex animate-fade-in flex-col items-center justify-center gap-6 bg-background"
      role="status"
      aria-live="polite"
      aria-label={GAME_COPY.loading.status}
    >
      <div className="relative">
        <Loader2 className="h-20 w-20 animate-spin text-primary" aria-hidden />
        <div className="absolute inset-0 flex items-center justify-center">
          {/* "GO!" only once the first clip is actually ready (build done). If the
              build overruns the countdown, keep the spinner instead of a
              misleading "GO!" that would sit there until the round truly starts. */}
          <span className="text-2xl font-bold tabular-nums text-primary">
            {loadingCount > 0 ? loadingCount : firstClipReady ? GAME_COPY.loading.go : ''}
          </span>
        </div>
      </div>
      <div className="space-y-2 text-center">
        <h1 className="animate-pulse gradient-text text-3xl font-bold">
          {GAME_COPY.loading.title}
        </h1>
        <p className="text-muted-foreground">
          {loadingCount === 0 && !firstClipReady
            ? GAME_COPY.loading.preparing
            : GAME_COPY.loading.headphones}
        </p>
      </div>
      {amIHost ? (
        <Button variant="destructive" onClick={onCancel} className="mt-8">
          {GAME_COPY.loading.cancel}
        </Button>
      ) : (
        <Button variant="outline" onClick={onLeaveSalon} className="mt-8">
          {GAME_COPY.loading.leaveSalon}
        </Button>
      )}
    </div>
  );
}
