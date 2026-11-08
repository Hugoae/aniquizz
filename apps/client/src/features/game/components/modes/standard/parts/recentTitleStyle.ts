import { Check, SkipForward, X } from 'lucide-react';
import type { RecentTitleOutcome } from '@/features/game/state/gameReducer';

/** Shared by the side strip and the small-screen pills. */
export const OUTCOME_STYLE: Record<
  RecentTitleOutcome,
  { icon: typeof Check; row: string; badge: string; number: string }
> = {
  found: {
    icon: Check,
    row: 'border-success/40 bg-success/10',
    badge: 'bg-success text-success-foreground',
    number: 'text-success',
  },
  missed: {
    icon: X,
    row: 'border-destructive/40 bg-destructive/10',
    badge: 'bg-destructive text-destructive-foreground',
    number: 'text-destructive',
  },
  skipped: {
    icon: SkipForward,
    row: 'border-warning/40 bg-warning/10',
    badge: 'bg-warning text-warning-foreground',
    number: 'text-warning',
  },
};
