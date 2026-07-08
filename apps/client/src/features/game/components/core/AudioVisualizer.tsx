import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  isPlaying?: boolean;
  className?: string;
  barCount?: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function AudioVisualizer({ isPlaying = true, className, barCount = 32 }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(() => Array(barCount).fill(0.3));

  useEffect(() => {
    // Respect reduced-motion: render a calm, static equalizer instead of animating.
    if (!isPlaying || prefersReducedMotion()) {
      setBars(Array(barCount).fill(0.15));
      return;
    }
    const interval = setInterval(() => {
      setBars((prev) => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, barCount]);

  return (
    <div className={cn('flex h-12 items-end justify-center gap-[2px]', className)}>
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 rounded-t-sm bg-gradient-to-t from-primary to-primary/50 transition-all duration-100"
          style={{ height: `${height * 100}%` }}
        />
      ))}
    </div>
  );
}
