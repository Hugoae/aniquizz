import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, ListMusic } from 'lucide-react';
import { isDailyVictory, type DailyResultDto } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ConfettiLayer } from '@/features/game/components/modes/standard/gameover/ConfettiLayer';
import {
  GLOW,
  SOLO_DEFEAT_CONFETTI,
  SOLO_VICTORY_CONFETTI,
} from '@/features/game/components/modes/standard/gameover/confettiPresets';
import { RoundHistoryList } from '@/features/game/components/modes/standard/gameover/RoundHistoryList';
import { DAILY_COPY } from '../copy/dailyCopy';
import { dailyRecapToHistory } from '../lib/dailyRecap';
import { DailyConfigHeader } from './DailyConfigHeader';
import { DailyScoreCard } from './DailyScoreCard';

interface DailyResultProps {
  result: DailyResultDto;
  username: string;
  avatar: string;
  onBack: () => void;
}

/** Same two-column recap as solo game-over: score card + round history. No medals, no replay. */
export function DailyResult({ result, username, avatar, onBack }: DailyResultProps) {
  const history = dailyRecapToHistory(result);
  const isSuccess = isDailyVictory(result.correctCount, result.activeRoundCount);
  const scrollRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [showStickySummary, setShowStickySummary] = useState(false);

  const scrollToDetail = useCallback(() => {
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const onScroll = useCallback(() => {
    const top = scrollRef.current?.scrollTop ?? 0;
    setShowStickySummary(top > 180);
  }, []);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto bg-background custom-scrollbar animate-fade-in"
    >
      {isSuccess ? (
        <ConfettiLayer dots={SOLO_VICTORY_CONFETTI} glowClassName={GLOW.soloVictory} />
      ) : (
        <ConfettiLayer dots={SOLO_DEFEAT_CONFETTI} glowClassName={GLOW.soloDefeat} />
      )}

      {showStickySummary && (
        <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <span className="font-mono text-sm font-bold tabular-nums">
            {result.correctCount}/{result.activeRoundCount}
          </span>
          <span className={cn('text-xs font-black uppercase', isSuccess ? 'text-success' : 'text-destructive')}>
            {isSuccess ? DAILY_COPY.victory : DAILY_COPY.defeat}
          </span>
        </div>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <DailyConfigHeader className="lg:col-span-3 lg:col-start-3" />

          <div className="flex flex-col gap-3 lg:col-span-2 lg:row-start-2 lg:self-start">
            <DailyScoreCard
              result={result}
              isSuccess={isSuccess}
              username={username}
              avatar={avatar}
            />

            <button
              type="button"
              onClick={scrollToDetail}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/30 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground lg:hidden"
            >
              {DAILY_COPY.seeRoundDetail}
              <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden />
            </button>
          </div>

          <div
            ref={detailRef}
            className="glass-card flex h-[600px] min-h-[600px] scroll-mt-4 flex-col overflow-hidden bg-card/30 lg:col-span-3 lg:row-start-2"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-secondary/20 p-4">
              <h2 className="flex items-center gap-2 font-bold">
                <ListMusic className="h-4 w-4 text-primary" aria-hidden />
                {DAILY_COPY.detailTitle}
              </h2>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground/90">
                {result.correctCount}/{result.activeRoundCount}
              </span>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
              <RoundHistoryList history={history} showPoints={false} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button onClick={onBack} variant="outline" className="h-12 gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {DAILY_COPY.backToDaily}
          </Button>
        </div>
      </div>
    </div>
  );
}
