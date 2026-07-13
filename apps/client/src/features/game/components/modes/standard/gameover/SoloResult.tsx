import { useCallback, useRef, useState } from 'react';
import { ChevronDown, ListMusic } from 'lucide-react';
import type { RoomSettings, RoundHistoryEntry, VictoryData } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { ConfettiLayer } from './ConfettiLayer';
import { GLOW, SOLO_DEFEAT_CONFETTI, SOLO_VICTORY_CONFETTI } from './confettiPresets';
import { MatchConfigHeader } from './MatchConfigHeader';
import { RoundHistoryList } from './RoundHistoryList';
import { SoloScoreCard } from './solo/SoloScoreCard';
import { SoloGameOverActions } from './solo/SoloGameOverActions';

interface SoloResultProps {
  currentUserId: string;
  victoryData: VictoryData;
  history: RoundHistoryEntry[];
  settings: Partial<RoomSettings>;
  onLeave: () => void;
  onReplay: () => void;
}

export function SoloResult({
  currentUserId,
  victoryData,
  history,
  settings,
  onLeave,
  onReplay,
}: SoloResultProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [showStickySummary, setShowStickySummary] = useState(false);

  const me =
    victoryData.rankings.find((p) => String(p.id) === String(currentUserId)) ?? victoryData.rankings[0];
  const soloMedal = victoryData.soloMedal ?? null;
  const isSuccess = !!soloMedal;
  const score = me?.score ?? 0;
  const maxPossibleScore = victoryData.totalMaxScore;
  const correctCount = me?.matchCorrectCount ?? 0;
  const totalRounds = me?.matchTotalCount ?? history.length;
  const songDifficulties =
    history.length > 0 ? history.map((r) => r.song.difficulty) : (settings.difficulty ?? ['medium']);

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
      className="absolute inset-0 z-50 flex animate-fade-in flex-col overflow-y-auto bg-background custom-scrollbar"
    >
      {isSuccess ? (
        <ConfettiLayer dots={SOLO_VICTORY_CONFETTI} glowClassName={GLOW.soloVictory} />
      ) : (
        <ConfettiLayer dots={SOLO_DEFEAT_CONFETTI} glowClassName={GLOW.soloDefeat} />
      )}

      {showStickySummary && (
        <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <span className="font-mono text-sm font-bold tabular-nums">
            {score}/{maxPossibleScore} pts
          </span>
          <span className="font-mono text-sm font-bold tabular-nums text-muted-foreground">
            {correctCount}/{totalRounds}
          </span>
          <span className={cn('text-xs font-black uppercase', isSuccess ? 'text-success' : 'text-destructive')}>
            {isSuccess ? 'Victoire' : 'Défaite'}
          </span>
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 md:min-h-0 md:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <MatchConfigHeader className="lg:col-span-3 lg:col-start-3" settings={settings} />

          <div className="flex flex-col gap-3 lg:col-span-2 lg:row-start-2 lg:self-start">
            <SoloScoreCard
              me={me}
              soloMedal={soloMedal}
              isSuccess={isSuccess}
              score={score}
              maxPossibleScore={maxPossibleScore}
              songDifficulties={songDifficulties}
              precision={settings.precision}
              xpEarned={me?.xpEarned}
            />

            <button
              type="button"
              onClick={scrollToDetail}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-border/60 bg-secondary/30 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground lg:hidden"
            >
              Voir le détail des rounds
              <ChevronDown className="h-4 w-4 animate-bounce" aria-hidden />
            </button>
          </div>

          <div
            ref={detailRef}
            className="glass-card flex h-[600px] min-h-[600px] scroll-mt-4 flex-col overflow-hidden bg-card/30 lg:col-span-3 lg:row-start-2"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-secondary/20 p-4">
              <h3 className="flex items-center gap-2 font-bold">
                <ListMusic className="h-4 w-4 text-primary" /> Détail de la partie
              </h3>
              <span className="font-mono text-sm font-bold tabular-nums text-foreground/90">
                {correctCount}/{totalRounds}
              </span>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
              <RoundHistoryList history={history} isSprint={settings.gameType === 'sprint'} />
            </div>
          </div>
        </div>

        <SoloGameOverActions onLeave={onLeave} onReplay={onReplay} />
      </div>
    </div>
  );
}
