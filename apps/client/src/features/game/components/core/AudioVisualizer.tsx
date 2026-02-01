import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isPlaying?: boolean;
  className?: string;
  barCount?: number; // Option pour configurer le nombre de barres
}

/**
 * Visualiseur audio simulé (fausses barres qui bougent).
 * Utilisé pendant la phase de "Guessing".
 */
export function AudioVisualizer({ 
  isPlaying = true, 
  className,
  barCount = 32 
}: AudioVisualizerProps) {
  // Initialisation des barres à une hauteur moyenne
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0.3));

  useEffect(() => {
    // Si le son est coupé ou en pause, on aplatit les barres
    if (!isPlaying) {
      setBars(Array(barCount).fill(0.1));
      return;
    }

    // Animation simulée : génère des hauteurs aléatoires toutes les 100ms
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, barCount]);

  return (
    <div className={cn("flex items-end justify-center gap-[2px] h-12", className)}>
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 rounded-t-sm bg-gradient-to-t from-primary to-primary/50 transition-all duration-100"
          style={{ 
            height: `${height * 100}%`,
            // Ajout d'un délai pour créer un effet d'onde visuelle
            animationDelay: `${i * 20}ms`
          }}
        />
      ))}
    </div>
  );
}