import { StandardGameOver } from './modes/standard/StandardGameOver';

interface GameOverProps {
  players: any[];
  currentUserId: string;
  onLeave: () => void;
  onReplay: () => void;
  gameMode?: string;
  history?: any[];
  settings?: any;
  victoryData?: any; 
}

export function GameOver(props: GameOverProps) {
  const isBattleRoyale = props.victoryData?.isBattleRoyale || props.settings?.gameType === 'battle-royale';

  return <StandardGameOver {...props} />;
}