import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LeaderboardEntry } from '@aniquizz/shared';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { toast } from 'sonner';
import { LeaderboardHero } from '@/features/leaderboard/components/LeaderboardHero';
import { LeaderboardList } from '@/features/leaderboard/components/LeaderboardList';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import {
  LeaderboardEmptyState,
  LeaderboardErrorBanner,
  LeaderboardSkeleton,
} from '@/features/leaderboard/components/LeaderboardStates';
import { LeaderboardTabs } from '@/features/leaderboard/components/LeaderboardTabs';
import { LeaderboardYouStrip } from '@/features/leaderboard/components/LeaderboardYouStrip';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';
import { useLeaderboard } from '@/features/leaderboard/hooks/useLeaderboard';
import { entriesBeyondPodium, podiumPlayerIds } from '@/features/leaderboard/lib/leaderboardList';
import {
  profileFromLeaderboardState,
  profilePathFromLeaderboard,
} from '@/features/leaderboard/lib/leaderboardNavigation';
import { cn } from '@/lib/utils';

export function LeaderboardPageContent() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const { setShowAuthModal } = useAuthModal();
  const board = useLeaderboard();
  const viewerId = profile?.id ?? null;
  const restEntries = board.data
    ? entriesBeyondPodium(board.data.entries, board.data.podium)
    : [];
  const visibleIds = new Set([
    ...(board.data ? podiumPlayerIds(board.data.podium) : []),
    ...restEntries.map((entry) => entry.id),
  ]);
  const busy = board.loading || board.refreshing;
  const linkState = session ? profileFromLeaderboardState(board.metric) : undefined;
  const hrefFor = session
    ? (entry: LeaderboardEntry) => profilePathFromLeaderboard(entry.id, board.metric)
    : undefined;

  const promptLogin = () => {
    toast.info(LEADERBOARD_COPY.loginToProfile);
    setShowAuthModal(true);
  };

  const liveMessage = board.loading
    ? LEADERBOARD_COPY.loadingAria
    : board.data
      ? `${board.data.pagination.totalItems} ${LEADERBOARD_COPY.rankedCount}`
      : '';

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-24 pt-24">
        <Button
          type="button"
          variant="ghost"
          className="w-fit gap-2 px-0 text-muted-foreground"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {LEADERBOARD_COPY.back}
        </Button>

        <LeaderboardHero eligibleCount={board.data?.pagination.totalItems ?? null} />
        <LeaderboardTabs metric={board.metric} onMetricChange={board.setMetric} />

        <div aria-live="polite" className="sr-only">
          {liveMessage}
        </div>

        {board.error && (
          <LeaderboardErrorBanner message={board.error} onRetry={board.retry} />
        )}

        <div aria-busy={busy}>
          {board.loading && !board.data ? (
            <LeaderboardSkeleton />
          ) : board.data && board.data.pagination.totalItems === 0 ? (
            <LeaderboardEmptyState onPlay={() => navigate('/play')} />
          ) : board.data ? (
            <div className={cn('space-y-8', board.refreshing && 'opacity-70')}>
              <LeaderboardPodium
                groups={board.data.podium}
                viewerId={viewerId}
                hrefFor={hrefFor}
                linkState={linkState}
                onSelect={session ? undefined : promptLogin}
              />
              {restEntries.length > 0 && (
                <LeaderboardList
                  entries={restEntries}
                  viewerId={viewerId}
                  hrefFor={hrefFor}
                  linkState={linkState}
                  onSelect={session ? undefined : promptLogin}
                />
              )}
              <LeaderboardYouStrip
                viewer={board.data.viewer}
                session={!!session}
                visibleIds={visibleIds}
                hrefFor={hrefFor}
                linkState={linkState}
                onSelect={session ? undefined : promptLogin}
              />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
