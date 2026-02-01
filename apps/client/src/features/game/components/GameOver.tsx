import { StandardGameOver } from './modes/standard/StandardGameOver';
import { BattleRoyaleGameOver } from './modes/battle-royale/BattleRoyaleGameOver';

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
  // Détection du mode : Soit via victoryData (serveur), soit via settings (client)
  const isBattleRoyale = props.victoryData?.isBattleRoyale || props.settings?.gameType === 'battle-royale';

  if (isBattleRoyale) {
    return <BattleRoyaleGameOver {...props} />;
  }

  return <StandardGameOver {...props} />;
}