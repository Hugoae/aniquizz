import type { RoomConfig } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';

/** Compact red mark shown next to a room or mode name. */
export function TestMatchMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-destructive-foreground',
        className,
      )}
    >
      Test
    </span>
  );
}

interface TestMatchOptionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Admin-only toggle. The server ignores this flag for anyone else. */
export function TestMatchOption({ config, update }: TestMatchOptionProps) {
  const active = config.testMatch === true;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => update({ testMatch: !active })}
      className={cn(
        'w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
        FOCUS_RING,
        active
          ? 'border-destructive bg-destructive text-destructive-foreground shadow-sm'
          : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground',
      )}
    >
      Partie test
    </button>
  );
}
