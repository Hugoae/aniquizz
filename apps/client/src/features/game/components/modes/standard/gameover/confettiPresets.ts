/** Shared decorative particle specs for game-over screens (design-token colors only). */

export interface ConfettiDot {
  top: string;
  left: string;
  color: string;
  size: string;
  anim: string;
  delay: string;
}

const BASE_LAYOUT: Omit<ConfettiDot, 'color'>[] = [
  { top: '6%', left: '10%', size: 'h-2 w-2', anim: 'animate-bounce', delay: 'delay-100' },
  { top: '12%', left: '28%', size: 'h-2.5 w-2.5', anim: 'animate-bounce', delay: 'delay-300' },
  { top: '8%', left: '52%', size: 'h-1.5 w-1.5', anim: 'animate-pulse', delay: 'delay-500' },
  { top: '18%', left: '68%', size: 'h-2 w-2', anim: 'animate-bounce', delay: 'delay-700' },
  { top: '32%', left: '6%', size: 'h-2 w-2', anim: 'animate-pulse', delay: 'delay-200' },
  { top: '42%', left: '22%', size: 'h-2.5 w-2.5', anim: 'animate-bounce', delay: 'delay-400' },
  { top: '55%', left: '14%', size: 'h-1.5 w-1.5', anim: 'animate-pulse', delay: 'delay-100' },
  { top: '48%', left: '48%', size: 'h-2 w-2', anim: 'animate-bounce', delay: 'delay-600' },
  { top: '62%', left: '38%', size: 'h-2 w-2', anim: 'animate-pulse', delay: 'delay-300' },
  { top: '72%', left: '12%', size: 'h-2.5 w-2.5', anim: 'animate-bounce', delay: 'delay-500' },
  { top: '10%', left: '82%', size: 'h-2 w-2', anim: 'animate-bounce', delay: 'delay-200' },
  { top: '28%', left: '90%', size: 'h-2 w-2', anim: 'animate-pulse', delay: 'delay-200' },
  { top: '40%', left: '84%', size: 'h-1.5 w-1.5', anim: 'animate-bounce', delay: 'delay-500' },
  { top: '52%', left: '94%', size: 'h-2.5 w-2.5', anim: 'animate-pulse', delay: 'delay-700' },
  { top: '58%', left: '78%', size: 'h-1.5 w-1.5', anim: 'animate-bounce', delay: 'delay-700' },
  { top: '70%', left: '88%', size: 'h-2 w-2', anim: 'animate-bounce', delay: 'delay-300' },
  { top: '78%', left: '62%', size: 'h-2 w-2', anim: 'animate-pulse', delay: 'delay-400' },
  { top: '86%', left: '30%', size: 'h-2.5 w-2.5', anim: 'animate-bounce', delay: 'delay-200' },
  { top: '90%', left: '50%', size: 'h-2 w-2', anim: 'animate-pulse', delay: 'delay-600' },
  { top: '84%', left: '74%', size: 'h-1.5 w-1.5', anim: 'animate-bounce', delay: 'delay-500' },
  { top: '92%', left: '18%', size: 'h-2 w-2', anim: 'animate-bounce', delay: 'delay-300' },
  { top: '88%', left: '90%', size: 'h-2 w-2', anim: 'animate-pulse', delay: 'delay-700' },
  { top: '22%', left: '44%', size: 'h-1.5 w-1.5', anim: 'animate-pulse', delay: 'delay-400' },
  { top: '36%', left: '58%', size: 'h-2 w-2', anim: 'animate-bounce', delay: 'delay-100' },
  { top: '64%', left: '52%', size: 'h-2.5 w-2.5', anim: 'animate-pulse', delay: 'delay-600' },
];

function withColors(colors: string[]): ConfettiDot[] {
  return BASE_LAYOUT.map((dot, i) => ({ ...dot, color: colors[i % colors.length] }));
}

/** Solo victory — green + gold tokens. */
export const SOLO_VICTORY_CONFETTI = withColors(['bg-success', 'bg-warning']);

/** Solo defeat — destructive palette. */
export const SOLO_DEFEAT_CONFETTI = withColors([
  'bg-destructive',
  'bg-destructive/80',
  'bg-destructive/70',
  'bg-destructive/60',
]);

/** Multi victory — same green + gold as solo victory. */
export const MULTI_VICTORY_CONFETTI = SOLO_VICTORY_CONFETTI;

/** Multi non-podium finish — muted destructive palette. */
export const MULTI_DEFEAT_CONFETTI = SOLO_DEFEAT_CONFETTI;

export const GLOW = {
  soloVictory: 'bg-gradient-to-b from-success/12 via-primary/5 to-transparent',
  soloDefeat: 'bg-gradient-to-b from-destructive/12 via-destructive/5 to-transparent',
  multiVictory: 'bg-gradient-to-b from-success/12 via-primary/5 to-transparent',
  multiDefeat: 'bg-gradient-to-b from-destructive/10 via-background to-transparent',
} as const;
