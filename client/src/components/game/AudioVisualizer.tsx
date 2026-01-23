import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isPlaying?: boolean;
  className?: string;
}

export function AudioVisualizer({ isPlaying = true, className }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(32).fill(0.3));

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(32).fill(0.1));
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className={cn("flex items-end justify-center gap-[2px] h-12", className)}>
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 rounded-t-sm bg-gradient-to-t from-primary to-primary/50 transition-all duration-100"
          style={{ 
            height: `${height * 100}%`,
            animationDelay: `${i * 20}ms`
          }}
        />
      ))}
    </div>
  );
}