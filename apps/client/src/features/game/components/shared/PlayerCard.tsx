import { StandardPlayerCard } from '../modes/standard/StandardPlayerCard';

interface PlayerCardProps {
  player: any;
  isCurrentUser?: boolean;
  showResult?: boolean;
  compact?: boolean;
  onClick?: () => void;
  hideScore?: boolean;
}

export function PlayerCard({
  player,
  isCurrentUser,
  showResult,
  onClick,
}: PlayerCardProps) {
  return (
    <StandardPlayerCard
      player={player}
      isCurrentUser={isCurrentUser}
      showResult={showResult}
      onClick={onClick}
    />
  );
}
