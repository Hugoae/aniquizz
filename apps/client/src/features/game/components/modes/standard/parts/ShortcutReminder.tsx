import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

interface ShortcutReminderProps {
  enabled: boolean;
  submitOnEnter: boolean;
}

/** Compact keyboard hint — hidden on coarse-pointer (touch) devices. */
export function ShortcutReminder({ enabled, submitOnEnter }: ShortcutReminderProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setShow(false);
      return;
    }
    const coarse =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    setShow(!coarse);
  }, [enabled]);

  if (!show) return null;

  return (
    <p className={cn('flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground')}>
      {submitOnEnter ? (
        <span className="inline-flex items-center gap-1">
          <Kbd>Entrée</Kbd> valider
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd> suggestions
      </span>
      <span className="inline-flex items-center gap-1">
        <Kbd>Échap</Kbd> fermer
      </span>
    </p>
  );
}
