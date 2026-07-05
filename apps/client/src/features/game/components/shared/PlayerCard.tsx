import { StandardPlayerCard } from '../modes/standard/StandardPlayerCard';
import { ChallengerPlayerCard } from '../modes/challenger/ChallengerPlayerCard';

interface PlayerCardProps {
  player: any;
  isCurrentUser?: boolean; 
  showResult?: boolean;    
  compact?: boolean;       
  onClick?: () => void;
  gameMode?: 'standard' | 'challenger';
  hideScore?: boolean; // Gardé pour compatibilité mais non utilisé dans la nouvelle structure pour l'instant
}

export function PlayerCard({ 
  player, 
  isCurrentUser, 
  showResult, 
  onClick, 
  gameMode 
}: PlayerCardProps) {
  
  if (gameMode === 'challenger'){
      return (
        <ChallengerPlayerCard 
            player={player} 
            isCurrentUser={isCurrentUser} 
            showResult={showResult} 
            onClick={onClick} 
        />
      );
  }

  // Par défaut Standard
  return (
    <StandardPlayerCard 
        player={player} 
        isCurrentUser={isCurrentUser} 
        showResult={showResult} 
        onClick={onClick} 
    />
  );
}