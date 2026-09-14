import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalSettingsContent } from '@/features/settings/components/GlobalSettingsContent';
import { subscribeSettingsOpen, type SettingsTab } from '@/features/settings/lib/openSettings';

/** Keep in sync with `.floating-settings-morph` in index.css. */
const SETTINGS_MORPH_MS = 500;

function settingsMorphMs(): number {
  if (typeof document === 'undefined') return SETTINGS_MORPH_MS;
  return document.documentElement.getAttribute('data-motion') === 'reduced' ? 0 : SETTINGS_MORPH_MS;
}

/**
 * Floating settings widget (bottom-right). Instead of opening a modal, the
 * button itself morphs: it stays pinned as a bottom bar while the content
 * panel grows fluidly upward out of it. Close is the reverse — the panel
 * retracts to the 56px trigger. Content must stay mounted during that
 * collapse or the height snaps instead of interpolating.
 */
export function FloatingSettingsButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<SettingsTab>('general');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const show = useCallback((nextTab?: SettingsTab) => {
    if (nextTab) setTab(nextTab);
    setMounted(true);
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    return subscribeSettingsOpen((next) => show(next));
  }, [show]);

  useEffect(() => {
    if (open || !mounted) return;
    const id = window.setTimeout(() => setMounted(false), settingsMorphMs());
    return () => window.clearTimeout(id);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) hide();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        hide();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [hide, open]);

  useEffect(() => {
    const panel = panelRef.current;
    if (panel) {
      if (open) panel.removeAttribute('inert');
      else panel.setAttribute('inert', '');
    }
    if (!open) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    const first = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-2rem)]">
      <div
        className={cn(
          'floating-settings-morph ml-auto overflow-hidden rounded-2xl border border-border/60 bg-popover/90 shadow-card backdrop-blur-xl',
          'transition-[width,border-color]',
          open ? 'w-[26rem] border-primary/30' : 'w-14 hover:border-primary/40',
        )}
      >
        <div
          id="floating-settings-panel"
          ref={panelRef}
          className={cn(
            'floating-settings-morph grid transition-[grid-template-rows]',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] pointer-events-none',
          )}
          aria-hidden={!open}
          {...(open ? { role: 'region', 'aria-label': 'Panneau des paramètres' } : {})}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain custom-scrollbar">
              {mounted ? <GlobalSettingsContent variant="floating" initialTab={tab} /> : null}
            </div>
          </div>
        </div>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? hide() : show())}
          aria-expanded={open}
          aria-controls="floating-settings-panel"
          aria-label={open ? 'Fermer les paramètres' : 'Paramètres'}
          className={cn(
            'flex h-14 w-full items-center text-primary transition-colors',
            open ? 'gap-3 border-t border-border/60 px-4' : 'justify-center',
          )}
        >
          <Settings
            className={cn(
              'floating-settings-morph h-6 w-6 shrink-0 transition-transform',
              open && 'rotate-90',
            )}
          />
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
