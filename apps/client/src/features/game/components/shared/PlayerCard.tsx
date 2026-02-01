import { useState, useEffect } from 'react';
import { Check, X, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { PointsBadge } from './PointsBadge';

interface PlayerCardProps {
  player: {
    id: string | number;
    name: string;
    avatar: string;
    score: number;
    displayScore?: number;
    streak?: number;
    isCorrect?: boolean | null;
    currentAnswer?: string | null;
    roundPoints?: number;
    isEliminated?: boolean;
    lives?: number;
    foundTime?: number;
    rank?: number;
  };
  isCurrentUser?: boolean; 
  showResult?: boolean;    
  compact?: boolean;       
  onClick?: () => void;
  gameMode?: 'standard' | 'battle-royale' | 'lives';
  hideScore?: boolean;     
}

export function PlayerCard({ 
  player, 
  isCurrentUser, 
  showResult, 
  onClick, 
  gameMode, 
  hideScore 
}: PlayerCardProps) {
  
  const [showPointsAnim, setShowPointsAnim] = useState(false);
  const isEliminated = player.isEliminated;
  
  const displayedAnswer = player.currentAnswer || "...";
  const isCorrect = player.isCorrect === true; 
  const isWrong = showResult && !isCorrect;

  useEffect(() => {
    if (showResult && (player.roundPoints || 0) > 0) {
      setShowPointsAnim(true);
      const timer = setTimeout(() => setShowPointsAnim(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowPointsAnim(false);
    }
  }, [showResult, player.roundPoints]);

  return (
    <div 
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 w-full min-w-[200px] backdrop-blur-md shadow-lg group overflow-visible",
        isEliminated ? "opacity-50 grayscale border-red-900/30 bg-red-950/10" : 
        isCurrentUser ? "bg-primary/10 border-primary/40 shadow-primary/10" : "bg-card/40 border-white/5 hover:bg-card/60",
        showResult && isCorrect && "border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
        showResult && isWrong && "border-red-500/50 bg-red-500/10"
      )}
      onClick={onClick}
    >
      {/* ✅ BULLE RÉPONSE AVEC "..." APRÈS 3 LIGNES */}
      {showResult && (
        <div className={cn(
          "absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 px-3 py-2 rounded-2xl text-[11px] font-bold shadow-xl border z-30 transition-all duration-300 animate-in zoom-in slide-in-from-bottom-2",
          // line-clamp-3 force l'affichage sur 3 lignes max avec "..."
          "text-center leading-tight w-max max-w-[160px] break-words whitespace-normal line-clamp-3 text-ellipsis overflow-hidden",
          isCorrect 
            ? "bg-green-500 text-white border-green-400" 
            : "bg-red-500 text-white border-red-400" 
        )}>
          {displayedAnswer}
          {/* Petite flèche */}
          <div className={cn(
            "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r",
            isCorrect ? "bg-green-500 border-green-400" : "bg-red-500 border-red-400"
          )} />
        </div>
      )}

      {/* INDICATEUR STREAK */}
      {(player.streak || 0) >= 3 && !isEliminated && (
          <div className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 bg-orange-500/10 border border-orange-500/50 px-1.5 py-0.5 rounded-full shadow-sm animate-in zoom-in duration-300">
            <Flame className={cn("h-3 w-3 fill-orange-500 text-orange-500", (player.streak || 0) >= 5 && "animate-pulse")} />
            <span className="text-[10px] font-black italic text-orange-500">{player.streak}</span>
          </div>
      )}

      {/* BADGE POINTS */}
      {showPointsAnim && (
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 z-30 animate-in zoom-in spin-in-3 duration-300">
              <PointsBadge 
                points={player.roundPoints || 0} 
                className="shadow-[0_0_10px_rgba(16,185,129,0.4)] bg-emerald-500/20 text-emerald-400 border-emerald-500/50 backdrop-blur-md" 
              />
          </div>
      )}

      {/* AVATAR */}
      <div className="relative shrink-0">
          <UserAvatar 
            avatar={player.avatar} 
            username={player.name} 
            className={cn(
                "h-12 w-12 border-2 shadow-sm transition-all",
                isCurrentUser ? "border-primary" : "border-white/10",
                showResult && isCorrect && "border-green-500 ring-2 ring-green-500/30",
                showResult && isWrong && "border-red-500"
            )} 
          />
          {showResult && (
              <div className={cn(
                  "absolute -bottom-1 -right-1 rounded-full p-0.5 border shadow-sm z-10",
                  isCorrect ? "bg-green-500 border-green-400 text-white" : "bg-red-500 border-red-400 text-white"
              )}>
                  {isCorrect ? <Check className="w-3 h-3 stroke-[4]" /> : <X className="w-3 h-3 stroke-[4]" />}
              </div>
          )}
      </div>

      {/* INFO JOUEUR */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between w-full">
            <span className={cn("font-bold truncate text-sm max-w-[100px]", isCurrentUser ? "text-primary" : "text-foreground")}>
                {player.name}
            </span>
            
            {!hideScore && (
                <div className="text-2xl font-black font-mono leading-none tracking-tight">
                    {player.score} <span className="text-[10px] text-muted-foreground font-normal relative -top-1">pts</span>
                </div>
            )}
        </div>

        {gameMode === 'battle-royale' && isEliminated && (
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1 block">Ghost</span>
        )}
      </div>
    </div>
  );
}