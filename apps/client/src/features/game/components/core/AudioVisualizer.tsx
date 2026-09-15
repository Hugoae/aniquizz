import { cn } from '@/lib/utils';
import { useMotionReduced } from '@/features/settings/lib/useMotionReduced';

interface AudioVisualizerProps {
  isPlaying?: boolean;
  className?: string;
  barCount?: number;
}

/** CSS-only equalizer — no setState tick loop during guessing. */
export function AudioVisualizer({
  isPlaying = true,
  className,
  barCount = 32,
}: AudioVisualizerProps) {
  const reduceMotion = useMotionReduced();
  const animate = isPlaying && !reduceMotion;

  return (
    <div
      className={cn('eq-bars flex h-12 items-end justify-center gap-[2px]', className)}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }, (_, i) => (
        <i
          key={i}
          className={cn(!animate && 'eq-bars-static')}
          style={animate ? { animationDelay: `${(i % 4) * 0.18}s` } : undefined}
        />
      ))}
    </div>
  );
}
