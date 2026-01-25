import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Flame, Skull, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/UserAvatar';

interface PlayerCardProps {
  player: {
    id: string | number;
    name: string;
    avatar: string;
    score: number;
    streak?: number;
    isCorrect?: boolean | null;
    level?: number;
    competitiveRank?: string;
    competitiveTier?: number;
    rank?: number;
    currentAnswer?: string | null;
    isEliminated?: boolean;
    lives?: number;
    foundTime?: number;
  };
  isCurrentUser?: boolean;
  showResult?: boolean;
  compact?: boolean;
  onClick?: () => void;
  gameMode?: 'standard' | 'battle-royale' | 'lives';
  hideScore?: boolean;
}

const rankColors: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-400',
  gold: 'text-yellow-500',
  platine: 'text-cyan-400',
  diamond: 'text-blue-400',
  masterweeb: 'text-purple-500',
};

export function PlayerCard({ player, isCurrentUser, showResult, compact, onClick, gameMode, hideScore }: PlayerCardProps) {
  const isEliminated = player.isEliminated;

  return (
    <div
      className={cn(
        "relative rounded-2xl p-3 transition-all min-w-[160px]",
        "bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-sm",
        "border border-border/50",
        isCurrentUser && "ring-2 ring-primary/50",
        showResult && player.isCorrect === true && !isEliminated && "ring-2 ring-success/60 bg-success/10",
        showResult && player.isCorrect === false && !isEliminated && "ring-2 ring-destructive/60 bg-destructive/10",
        isEliminated && "opacity-40 grayscale",
        onClick && "cursor-pointer hover:bg-secondary/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Avatar with status indicator */}
        <div className="relative shrink-0">
          <UserAvatar 
            avatar={player.avatar}
            username={player.name}
            className="h-12 w-12 border-2 border-background shadow-lg"
          />
          
          {/* Eliminated skull overlay */}
          {isEliminated && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-full">
              <Skull className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          
          {/* Result indicator badge */}
          {!isEliminated && showResult && player.isCorrect !== null && player.isCorrect !== undefined && (
            <div className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md",
              player.isCorrect ? "bg-success" : "bg-destructive"
            )}>
              {player.isCorrect ? (
                <Check className="h-3 w-3 text-success-foreground" />
              ) : (
                <X className="h-3 w-3 text-destructive-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-semibold text-sm truncate",
            isEliminated && "line-through text-muted-foreground"
          )}>
            {player.name}
          </div>
          
          {/* Found time on reveal */}
          {showResult && player.isCorrect && player.foundTime && (
            <div className="text-xs text-success font-medium">
              Trouvé en {player.foundTime}s
            </div>
          )}
          
        </div>

        {/* Score section */}
        <div className="flex flex-col items-end gap-1">
          
          {/* Streak Indicator (MODIFIÉ) */}
          {player.streak && player.streak >= 3 && !isEliminated && !hideScore && (
            <div className="flex items-center gap-1 text-orange-500 animate-in zoom-in duration-300">
              <Flame className={cn("h-3.5 w-3.5 fill-orange-500", player.streak >= 5 && "animate-pulse")} />
              <span className="text-xs font-black italic">{player.streak}</span>
            </div>
          )}
          
          {/* Score */}
          {!hideScore && (
            <div className={cn(
              "font-bold text-xl tabular-nums",
              isEliminated ? "text-muted-foreground" : "text-primary"
            )}>
              {player.score}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}