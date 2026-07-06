import { useState, useEffect } from 'react';
import { Flame, Check } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { PlayerCardBase } from '../../shared/PlayerCardBase';

interface StandardPlayerCardProps {
  player: any;
  isCurrentUser?: boolean;
  showResult?: boolean;
  onClick?: () => void;
}

export function StandardPlayerCard({ player, isCurrentUser, showResult, onClick }: StandardPlayerCardProps) {
  
  const isCorrect = player.isCorrect === true;
  const isWrong = showResult && !isCorrect;
  const displayedAnswer = player.currentAnswer || "...";
  const answeredDuringGuess = !showResult && player.hasAnswered === true;

  // Anti-cheat: signal THAT a player has answered, never the content.
  const answeredBadge = answeredDuringGuess && (
    <div className="absolute -top-2 -left-2 z-10 flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 border border-primary/50 shadow-sm animate-in zoom-in duration-300">
      <Check className="h-3 w-3 text-primary" />
    </div>
  );

  // Bulle de réponse simple (Sans Timer)
  const bubble = showResult && (
    <div className={cn(
      "absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl text-[11px] font-bold shadow-xl border z-30 transition-all duration-300 animate-in zoom-in slide-in-from-bottom-2",
      "text-center w-max max-w-[150px]", 
      isCorrect ? "bg-green-500 text-white border-green-400" : "bg-red-500 text-white border-red-400"
    )}>
      <span className="break-words whitespace-normal line-clamp-2 leading-tight w-full">
        {displayedAnswer}
      </span>
      <div className={cn(
        "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r",
        isCorrect ? "bg-green-500 border-green-400" : "bg-red-500 border-red-400"
      )} />
    </div>
  );

  // Badge Streak
  const streakBadge = (player.streak || 0) >= 3 && (
      <div className="absolute -top-2 -right-2 z-10 flex items-center gap-0.5 bg-orange-500/10 border border-orange-500/50 px-1.5 py-0.5 rounded-md shadow-sm animate-in zoom-in duration-300">
        <Flame className={cn("h-3 w-3 fill-orange-500 text-orange-500", (player.streak || 0) >= 5 && "animate-pulse")} />
        <span className="text-[10px] font-black italic text-orange-500">{player.streak}</span>
      </div>
  );

  return (
    <PlayerCardBase
      player={player}
      isCurrentUser={isCurrentUser}
      onClick={onClick}
      bubbleContent={bubble}
      topLeftContent={answeredBadge}
      topRightContent={streakBadge}
      className={cn(
        showResult && isCorrect && "border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
        showResult && isWrong && "border-red-500/50 bg-red-500/10"
      )}
    />
  );
}
