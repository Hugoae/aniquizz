import { Heart, Medal, Clock, HeartCrack, Skull } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { PlayerCardBase } from '../../shared/PlayerCardBase';

interface ChallengerPlayerCardProps {
  player: any;
  isCurrentUser?: boolean;
  showResult?: boolean;
  onClick?: () => void;
}

export function ChallengerPlayerCard({ player, isCurrentUser, showResult, onClick }: ChallengerPlayerCardProps) {
  
  // Calcul des vies : 3 - attempts
  const lives = Math.max(0, 3 - (player.attempts || 0));
  const isEliminated = lives === 0;
  const isCorrect = player.isCorrect === true;
  const isWrong = showResult && !isCorrect;
  const displayedAnswer = player.currentAnswer || "...";

  // Bulle Riche (Avec Timer)
  const bubble = showResult && (
    <div className={cn(
      "absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl text-[11px] font-bold shadow-xl border z-30 transition-all duration-300 animate-in zoom-in slide-in-from-bottom-2",
      "text-center w-max max-w-[150px] flex flex-col items-center justify-center gap-1",
      isCorrect ? "bg-green-500 text-white border-green-400" : "bg-red-500 text-white border-red-400"
    )}>
      <span className="break-words whitespace-normal line-clamp-2 leading-tight w-full">
        {displayedAnswer}
      </span>
      
      {/* ⏱️ Timer précis */}
      {isCorrect && player.timeTaken !== undefined && (
         <div className="flex items-center gap-1.5 pt-1 mt-0.5 border-t border-white/30 w-full justify-center">
             <Clock className="w-3.5 h-3.5 opacity-80" />
             <span className="text-xs font-mono font-black tracking-wide">{Number(player.timeTaken).toFixed(2)}s</span>
         </div>
      )}

      <div className={cn(
        "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-b border-r",
        isCorrect ? "bg-green-500 border-green-400" : "bg-red-500 border-red-400"
      )} />
    </div>
  );

  // Médaille
  const medal = player.rank && player.rank <= 3 ? (
      <div className={cn("absolute -top-3 -left-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full border shadow-lg backdrop-blur-md animate-in zoom-in spin-in-3", 
          player.rank === 1 ? "bg-yellow-400/10 border-yellow-400/50 text-yellow-400" :
          player.rank === 2 ? "bg-slate-300/10 border-slate-300/50 text-slate-300" :
          "bg-amber-600/10 border-amber-600/50 text-amber-600"
      )}>
          <Medal className="w-3.5 h-3.5 fill-current" />
          <span className="text-[10px] font-bold">{player.rank === 1 ? "1er" : player.rank === 2 ? "2e" : "3e"}</span>
      </div>
  ) : null;

  return (
    <PlayerCardBase
      player={{...player, isEliminated}}
      isCurrentUser={isCurrentUser}
      onClick={onClick}
      bubbleContent={bubble}
      topLeftContent={medal}
      className={cn(
        showResult && isCorrect && "border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
        showResult && isWrong && "border-red-500/50 bg-red-500/10"
      )}
    >
      {/* Zone Vies en bas */}
      <div className="flex gap-0.5">
          {isEliminated ? (
             <span className="text-[10px] uppercase font-bold text-red-500/70 tracking-wider flex items-center gap-1">
                 <HeartCrack className="w-3 h-3" /> Éliminé
             </span>
          ) : (
            [...Array(3)].map((_, i) => (
                <Heart 
                    key={i} 
                    className={cn(
                        "w-3.5 h-3.5 transition-all duration-300",
                        i < lives 
                            ? "fill-red-500 text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)] scale-100" 
                            : "fill-transparent text-slate-700/30 scale-75"
                    )} 
                />
            ))
          )}
      </div>
    </PlayerCardBase>
  );
}