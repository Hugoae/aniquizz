import { cn } from '@/lib/utils';
import { AudioVisualizer } from '../core/AudioVisualizer'; // Assure-toi que le chemin d'import est correct selon ta structure

interface CircularGameTimerProps {
  timeLeft: number;
  maxTime?: number; // Optional, used to derive % when progress is not passed directly
  progress?: number; // 0 to 100
  phase: 'loading' | 'guessing' | 'revealed' | 'ended';
  isPaused?: boolean;
  showVisualizer?: boolean;
  className?: string;
}

export function CircularGameTimer({
  timeLeft,
  maxTime = 30,
  progress,
  phase,
  isPaused = false,
  showVisualizer = true,
  className
}: CircularGameTimerProps) {
  
  const calculatedProgress = progress ?? Math.min((timeLeft / maxTime) * 100, 100);
  
  const isUrgent = timeLeft <= 3 && timeLeft > 0;
  
  const getTimerColor = () => {
      if (timeLeft > 3) return "text-white";
      return "text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]";
  };

  return (
    <div className={cn(
      "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 z-20 bg-background",
      phase === 'revealed' ? "opacity-0 pointer-events-none z-10" : "opacity-100",
      className
    )}>
      <div className={cn("relative transition-transform duration-200", isUrgent && "scale-110")}>
        {/* Cercle SVG */}
        <svg className="w-32 h-32 -rotate-90">
            {/* Fond du cercle */}
            <circle 
                cx="50%" cy="50%" r="45%" 
                fill="none" 
                stroke="hsl(var(--secondary))" 
                strokeWidth="6" 
            />
            {/* Barre de progression */}
            <circle 
                cx="50%" cy="50%" r="45%" 
                fill="none" 
                stroke={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"} 
                strokeWidth="6" 
                strokeLinecap="round" 
                pathLength="100" 
                strokeDasharray="100" 
                strokeDashoffset={(100 - calculatedProgress) * -1} 
                className="transition-[stroke-dashoffset] duration-200 ease-linear" 
            />
        </svg>

        {/* Chiffre Central */}
        <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className={cn(
                "text-4xl font-black tabular-nums transition-colors duration-200", 
                getTimerColor(),
                isUrgent && "animate-pulse"
            )}>
                {timeLeft}
            </span>
        </div>
      </div>

      {/* Audio Visualizer */}
      {showVisualizer && phase === 'guessing' && (
          <div className="mt-6 w-1/2 h-8 flex items-center justify-center">
             <AudioVisualizer 
                isPlaying={!isPaused} 
                className={cn("h-8", isUrgent ? "text-destructive" : "text-primary")} 
             />
          </div>
      )}
      
      <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">
        {phase === 'loading' ? "Chargement..." : "Écoutez bien..."}
      </p>
    </div>
  );
}