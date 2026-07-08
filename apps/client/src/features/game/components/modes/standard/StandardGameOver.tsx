import type { GameMode, GamePlayer, RoomSettings, RoundHistoryEntry, VictoryData } from '@aniquizz/shared';
import { SoloResult } from './gameover/SoloResult';
import { MultiResult } from './gameover/MultiResult';

export interface StandardGameOverProps {
  /** Latest live roster; rankings in `victoryData` remain authoritative at game over. */
  players: GamePlayer[];
  currentUserId: string;
  onLeave: () => void;
  onReplay: () => void;
  gameMode: GameMode;
  history: RoundHistoryEntry[];
  settings: Partial<RoomSettings>;
  victoryData: VictoryData;
}

export function StandardGameOver({
  currentUserId,
  onLeave,
  onReplay,
  gameMode,
  history,
  settings,
  victoryData,
}: StandardGameOverProps) {
  if (gameMode === 'solo') {
    return (
      <SoloResult
        currentUserId={currentUserId}
        victoryData={victoryData}
        history={history}
        settings={settings}
        onLeave={onLeave}
        onReplay={onReplay}
      />
    );
  }

  return (
    <MultiResult
      currentUserId={currentUserId}
      victoryData={victoryData}
      history={history}
      settings={settings}
      onLeave={onLeave}
    />
  );
}
