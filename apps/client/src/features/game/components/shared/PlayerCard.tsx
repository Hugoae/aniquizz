import type { GamePlayer } from '@aniquizz/shared';
import { StandardPlayerCard } from '../modes/standard/StandardPlayerCard';

interface PlayerCardProps {
  player: GamePlayer;
  isCurrentUser?: boolean;
  showResult?: boolean;
  rank?: number;
  rankPending?: boolean;
  flash?: boolean;
  onClick?: () => void;
  hideScore?: boolean;
}

export function PlayerCard({ player, isCurrentUser, showResult, rank, rankPending, flash, onClick, hideScore }: PlayerCardProps) {
  return (
    <StandardPlayerCard
      player={player}
      isCurrentUser={isCurrentUser}
      showResult={showResult}
      rank={rank}
      rankPending={rankPending}
      flash={flash}
      onClick={onClick}
      hideScore={hideScore}
    />
  );
}
