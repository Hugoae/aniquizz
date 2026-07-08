import { UserPlus, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A placeholder seat rendered for every free slot up to `maxPlayers`. Fills the
 * players grid so a near-empty lobby communicates its capacity, and turns the
 * first free seats into an invite call-to-action.
 */
interface LobbySeatProps {
  variant: 'empty' | 'invite';
  /** Rendered for the invite variant (a dropdown trigger). */
  children?: React.ReactNode;
}

export function LobbySeat({ variant, children }: LobbySeatProps) {
  if (variant === 'invite') {
    return (
      <div className="group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-accent/30 bg-accent/[0.04] p-6 text-center transition-colors hover:border-accent/60 hover:bg-accent/[0.08]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-accent/40 text-accent transition-transform group-hover:scale-105">
          <UserPlus className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-accent">Inviter un ami</p>
        {children}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/30 bg-secondary/[0.03] p-6 text-center',
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border/40 text-muted-foreground/40">
        <UserRound className="h-7 w-7" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/50">Place libre</p>
    </div>
  );
}
