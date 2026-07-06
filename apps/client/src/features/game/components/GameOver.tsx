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
  return <StandardGameOver {...props} />;
}
