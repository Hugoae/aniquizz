import { useState } from 'react';
import { ListMusic } from 'lucide-react';
import {
  isSpeedBonusEnabled,
  type RoomSettings,
  type RoundHistoryEntry,
  type VictoryData,
} from '@aniquizz/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { computeRanks } from '@/features/game/utils/ranking';
import { ConfettiLayer } from './ConfettiLayer';
import { GLOW, MULTI_DEFEAT_CONFETTI, MULTI_VICTORY_CONFETTI } from './confettiPresets';
import { MatchConfigHeader } from './MatchConfigHeader';
import { MultiPodium } from './MultiPodium';
import { FinalRanking } from './FinalRanking';
import { RoundHistoryList } from './RoundHistoryList';

interface MultiResultProps {
  currentUserId: string;
  victoryData: VictoryData;
  history: RoundHistoryEntry[];
  settings: Partial<RoomSettings>;
  onLeave: () => void;
}

export function MultiResult({
  currentUserId,
  victoryData,
  history,
  settings,
  onLeave,
}: MultiResultProps) {
  const [showDetail, setShowDetail] = useState(false);

  // A race arrives already ordered (most found, then fewest heard, then time left);
  // re-sorting on score would erase that order.
  const raceStandings = victoryData.race?.standings;
  const sortedPlayers = raceStandings
    ? [...victoryData.rankings]
    : [...victoryData.rankings].sort((a, b) => b.score - a.score);
  const raceByUser = raceStandings
    ? new Map(raceStandings.map((standing) => [standing.userId, standing]))
    : undefined;
  const ranks = raceByUser
    ? new Map(
        sortedPlayers.map((p) => [
          String(p.id),
          raceByUser.get(String(p.id))?.rank ?? sortedPlayers.length,
        ]),
      )
    : computeRanks(sortedPlayers);
  const myRank = ranks.get(String(currentUserId)) ?? sortedPlayers.length;
  const isPlayerWinner = victoryData.winnerIds.some((id) => String(id) === String(currentUserId));

  const me = sortedPlayers.find((p) => String(p.id) === String(currentUserId));
  const correctCount = me?.matchCorrectCount ?? 0;
  const totalRounds = me?.matchTotalCount ?? history.length;

  return (
    <div className="absolute inset-0 z-50 flex animate-fade-in flex-col overflow-y-auto bg-background custom-scrollbar">
      {isPlayerWinner ? (
        <ConfettiLayer dots={MULTI_VICTORY_CONFETTI} glowClassName={GLOW.multiVictory} />
      ) : (
        <ConfettiLayer dots={MULTI_DEFEAT_CONFETTI} glowClassName={GLOW.multiDefeat} />
      )}

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-6 p-4 md:min-h-0 md:p-8">
        <MatchConfigHeader settings={settings} />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <MultiPodium
            sortedPlayers={sortedPlayers}
            isPlayerWinner={isPlayerWinner}
            myRank={myRank}
            ranks={ranks}
            scoreUnit={raceByUser ? 'titres' : undefined}
            race={raceByUser}
          />
          <FinalRanking
            sortedPlayers={sortedPlayers}
            currentUserId={currentUserId}
            ranks={ranks}
            race={raceByUser}
            onLeave={onLeave}
            onShowDetail={() => setShowDetail(true)}
          />
        </div>
      </div>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden bg-card pt-8 sm:max-w-2xl sm:rounded-xl">
          <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 pb-4 pr-10">
            <DialogTitle className="font-display flex items-center gap-2 text-xl font-bold">
              <ListMusic className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              Détail de ma partie
            </DialogTitle>
            {totalRounds > 0 && (
              <p className="font-mono text-sm font-bold tabular-nums text-muted-foreground">
                {correctCount} / {totalRounds}
              </p>
            )}
          </DialogHeader>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto py-4">
            <RoundHistoryList history={history} speedBonusEnabled={isSpeedBonusEnabled(settings)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
