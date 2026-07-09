import { useEffect, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalSettingsContent } from '@/features/settings/components/GlobalSettingsContent';

/**
 * Floating settings widget (bottom-right). Instead of opening a modal, the
 * button itself morphs: it stays pinned as a bottom bar while the content
 * panel grows fluidly upward out of it. Closes via the X or an outside click.
 */
export function FloatingSettingsButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-6 right-6 z-50">
      <div
        className={cn(
          'ml-auto overflow-hidden rounded-2xl border border-border/60 bg-popover/90 shadow-card backdrop-blur-xl',
          'transition-[width,border-color] duration-300 ease-out',
          open ? 'w-[26rem] border-primary/30' : 'w-14 hover:border-primary/40',
        )}
      >
        {/* Reveal region — grows fluidly out of the bar (grid-rows trick) */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none',
          )}
          aria-hidden={!open}
          {...(open ? { role: 'region', 'aria-label': 'Panneau des paramètres' } : {})}
        >
          <div className="overflow-hidden">
            <GlobalSettingsContent variant="floating" />
          </div>
        </div>

        {/* Pinned bar / trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Fermer les paramètres' : 'Paramètres'}
          className={cn(
            'flex h-14 w-full items-center text-primary transition-colors',
            open ? 'gap-3 border-t border-border/60 px-4' : 'justify-center',
          )}
        >
          <Settings className={cn('h-6 w-6 shrink-0 transition-transform duration-300', open && 'rotate-90')} />
          <span
            className={cn(
              'overflow-hidden whitespace-nowrap text-left text-base font-bold text-foreground transition-[opacity,width] duration-200',
              open ? 'flex-1 opacity-100 delay-100' : 'w-0 opacity-0',
            )}
          >
            Paramètres
          </span>
          <span
            className={cn(
              'grid h-8 shrink-0 place-items-center overflow-hidden rounded-lg text-muted-foreground transition-[opacity,width] duration-200 hover:bg-secondary hover:text-foreground',
              open ? 'w-8 opacity-100 delay-100' : 'pointer-events-none w-0 opacity-0',
            )}
            aria-hidden
          >
            <X className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  );
}
