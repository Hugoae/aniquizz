import { PlayerCardBase } from '../../shared/PlayerCardBase';

interface TimeTrialPlayerCardProps {
  player: any;
  isCurrentUser?: boolean;
}

export function TimeTrialPlayerCard({ player, isCurrentUser }: TimeTrialPlayerCardProps) {
  // On peut ajouter des props spécifiques ici si besoin (ex: affichage du Streak différent)
  return (
    <PlayerCardBase
        player={player}
        isCurrentUser={isCurrentUser}
        className="border-2 shadow-xl" // Un peu plus de style pour le mode Time Trial
    />
  );
}