import { cn } from '@/lib/utils';
import type { ConfettiDot } from './confettiPresets';

interface ConfettiLayerProps {
  dots: readonly ConfettiDot[];
  glowClassName: string;
}

/** Full-viewport decorative particles (fixed — intentional for game-over hero). */
export function ConfettiLayer({ dots, glowClassName }: ConfettiLayerProps) {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className={cn('absolute left-1/2 top-0 h-[45vh] w-full -translate-x-1/2 blur-3xl', glowClassName)} />
      {dots.map((dot, i) => (
        <div
          key={i}
          className={cn('absolute rounded-full', dot.color, dot.size, dot.anim, dot.delay)}
          style={{ top: dot.top, left: dot.left }}
        />
      ))}
    </div>
  );
}
