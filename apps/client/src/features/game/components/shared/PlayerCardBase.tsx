import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import React from 'react';

export interface PlayerCardBaseProps {
  player: {
    id: string | number;
    name?: string;      // Peut être undefined
    username?: string;  // Alternative courante
    avatar: string;
    score: number;
    isEliminated?: boolean;
    isCorrect?: boolean | null;
  };
  isCurrentUser?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode; 
  topRightContent?: React.ReactNode; 
  topLeftContent?: React.ReactNode; 
  bubbleContent?: React.ReactNode; 
}

export function PlayerCardBase({
  player,
  isCurrentUser,
  onClick,
  className,
  children,
  topRightContent,
  topLeftContent,
  bubbleContent
}: PlayerCardBaseProps) {
  
  const isEliminated = player.isEliminated;
  
  // Récupération sécurisée du nom
  const displayName = player.name || player.username || "Joueur";
  
  // Vérifie s'il y a du contenu en bas (ex: Vies)
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div 
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 w-full min-w-[200px] backdrop-blur-md shadow-lg group overflow-visible",
        isEliminated ? "opacity-60 grayscale border-red-900/30 bg-red-950/10" : 
        isCurrentUser ? "bg-primary/10 border-primary/40 shadow-primary/10" : "bg-card/40 border-white/5 hover:bg-card/60",
        className
      )}
      onClick={onClick}
    >
      {/* Contenu Coin Supérieur Gauche (Médaille) */}
      {topLeftContent}

      {/* Contenu Coin Supérieur Droit (Streak) */}
      {topRightContent}

      {/* Bulle de Réponse (Flottante) */}
      {bubbleContent}

      {/* AVATAR */}
      <div className="relative shrink-0">
          <UserAvatar 
            avatar={player.avatar} 
            username={displayName} 
            className={cn(
                "h-12 w-12 border-2 shadow-sm transition-all",
                isCurrentUser ? "border-primary" : "border-white/10"
            )} 
          />
      </div>

      {/* INFO JOUEUR */}
      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
        
        {/* LIGNE DU HAUT : Nom + Score */}
        <div className={cn(
            "flex items-center justify-between w-full gap-3", 
            !hasChildren && "h-full" // Si pas d'enfants, on utilise toute la hauteur pour centrer
        )}>
            {/* NOM : Prend l'espace restant, coupe si trop long */}
            <span 
                className={cn(
                    "font-bold truncate text-sm flex-1 min-w-0", 
                    isCurrentUser ? "text-primary" : "text-foreground"
                )} 
                title={displayName}
            >
                {displayName}
            </span>
            
            {/* SCORE : Ne rétrécit pas, ne passe pas à la ligne */}
            <div className="text-2xl font-black font-mono leading-none tracking-tight shrink-0 flex items-baseline gap-1 whitespace-nowrap">
                {player.score} 
                <span className="text-[10px] text-muted-foreground font-normal">pts</span>
            </div>
        </div>

        {/* LIGNE DU BAS : Zone extensible pour Vies / Statut */}
        {hasChildren && (
            <div className="flex items-center justify-between mt-1 h-4 animate-in fade-in w-full">
                 {children}
            </div>
        )}
      </div>
    </div>
  );
}
