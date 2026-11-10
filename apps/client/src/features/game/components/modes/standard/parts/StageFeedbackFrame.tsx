import { useEffect, useState, type ReactNode } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StageFeedback, StageFeedbackKind } from '@/features/game/state/gameReducer';
import { GAME_COPY } from '@/features/game/copy/gameCopy';

/** Slightly shorter than the CSS cue durations so the last frame is never a snap-back. */
const CUE_LIFETIME_MS = 1050;
/** Time-gain chip stays readable after the find. Still shorter than its CSS fade. */
const BONUS_CUE_LIFETIME_MS = 2900;

const RING_CLASS: Record<StageFeedbackKind, string> = {
  correct: 'border-success shadow-[0_0_40px_hsl(var(--success)/0.55)]',
  bonus: 'border-primary shadow-[0_0_48px_hsl(var(--primary)/0.65)]',
  wrong: 'border-destructive shadow-[0_0_40px_hsl(var(--destructive)/0.55)]',
  missed: 'border-destructive/70 shadow-[0_0_28px_hsl(var(--destructive)/0.35)]',
  skip: 'border-warning shadow-[0_0_32px_hsl(var(--warning)/0.45)]',
};

const CHIP_CLASS: Record<StageFeedbackKind, string> = {
  correct: 'border-success/50 bg-success text-success-foreground',
  bonus: 'border-primary/50 bg-primary text-primary-foreground',
  wrong: 'border-destructive/50 bg-destructive text-destructive-foreground',
  missed: 'border-destructive/40 bg-background/95 text-destructive',
  skip: 'border-warning/50 bg-warning text-warning-foreground',
};

function chipLabel(feedback: StageFeedback): string {
  const copy = GAME_COPY.stageFeedback;
  if (feedback.kind === 'bonus' && feedback.deltaMs != null) {
    return `+${Math.round(feedback.deltaMs / 1000)} s`;
  }
  if (feedback.kind === 'correct') return copy.correct;
  if (feedback.kind === 'missed') return copy.missed;
  if (feedback.deltaMs == null) return feedback.kind === 'skip' ? copy.missed : copy.wrong;
  const seconds = Math.round(Math.abs(feedback.deltaMs) / 1000);
  return `−${seconds} s`;
}

function announceLabel(feedback: StageFeedback): string {
  const copy = GAME_COPY.stageFeedback.announce;
  if (feedback.kind === 'bonus') {
    const seconds = Math.round(Math.abs(feedback.deltaMs ?? 0) / 1000);
    return copy.bonus(seconds);
  }
  if (feedback.deltaMs == null && feedback.kind === 'wrong') return copy.wrongPlain;
  if (feedback.deltaMs == null && feedback.kind === 'skip') return copy.skipPlain;
  return copy[feedback.kind];
}

interface StageFeedbackFrameProps {
  feedback: StageFeedback | null;
  enabled: boolean;
  children: ReactNode;
}

/**
 * Wraps the video stage: shake + coloured ring + floating chip on answer events.
 * Never keyed or remounted — the child owns the live `<video>` element.
 */
export function StageFeedbackFrame({ feedback, enabled, children }: StageFeedbackFrameProps) {
  const [active, setActive] = useState<StageFeedback | null>(null);
  const seq = feedback?.seq;

  useEffect(() => {
    if (!enabled || !feedback) {
      setActive(null);
      return;
    }
    // Drop the cue for one frame so back-to-back events restart the CSS animations.
    setActive(null);
    const raf = window.requestAnimationFrame(() => setActive(feedback));
    const lifetime = feedback.kind === 'bonus' ? BONUS_CUE_LIFETIME_MS : CUE_LIFETIME_MS;
    const t = window.setTimeout(() => setActive(null), lifetime);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
    // Replay only when a new event arrives (seq), not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq, enabled]);

  const shake = active?.kind === 'wrong' || active?.kind === 'skip';
  const bonus = active?.kind === 'bonus';

  return (
    <div
      className={cn(
        'relative flex w-full max-w-[850px] shrink-0 justify-center',
        shake && 'animate-shake',
        active?.kind === 'correct' && 'animate-stage-pop',
        bonus && 'animate-stage-bonus',
      )}
    >
      {children}
      {active && (
        <>
          <div
            key={`ring-${active.seq}`}
            className={cn(
              'pointer-events-none absolute inset-0 z-[60] rounded-xl border-4',
              bonus ? 'animate-stage-flash-hold' : 'animate-stage-flash',
              RING_CLASS[active.kind],
            )}
            aria-hidden="true"
          />
          <span
            key={`chip-${active.seq}`}
            className={cn(
              'pointer-events-none absolute left-1/2 top-6 z-[61] whitespace-nowrap rounded-full border px-4 py-1.5 font-display text-lg font-extrabold tabular-nums shadow-lg',
              bonus ? 'animate-float-up-hold' : 'animate-float-up',
              CHIP_CLASS[active.kind],
            )}
            aria-hidden="true"
          >
            {active.kind === 'bonus' && (
              <Flame className="mr-1 inline h-4 w-4 fill-current" aria-hidden="true" />
            )}
            {chipLabel(active)}
          </span>
        </>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {active ? announceLabel(active) : ''}
      </span>
    </div>
  );
}
