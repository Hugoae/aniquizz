import { useCallback, useEffect, useRef, useState } from 'react';
import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlobalSettingsContent } from '@/features/settings/components/GlobalSettingsContent';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import { cycleTabWithin } from '@/features/settings/lib/cycleTabWithin';
import {
  subscribeFloatingSettingsSuppressed,
  subscribeSettingsOpen,
  type SettingsTab,
} from '@/features/settings/lib/openSettings';

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
  const [suppressed, setSuppressed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const show = useCallback((nextTab?: SettingsTab) => {
    if (nextTab) setTab(nextTab);
    setMounted(true);
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => subscribeFloatingSettingsSuppressed(setSuppressed), []);

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
        return;
      }
      if (rootRef.current) cycleTabWithin(rootRef.current, e);
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

  if (suppressed) return null;

  return (
    <div
      ref={rootRef}
      className="fixed z-50 max-w-[calc(100vw-2rem)] bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1.5rem,env(safe-area-inset-right,0px))]"
    >
      <div
        className={cn(
          'floating-settings-morph ml-auto overflow-hidden rounded-2xl border border-border/60 bg-popover/90 shadow-card backdrop-blur-xl',
          'transition-[width,border-color]',
          open ? 'w-[26rem] border-primary/30' : 'w-14 hover:border-primary/40',
        )}
        {...(open
          ? {
              role: 'dialog',
              'aria-modal': true,
              'aria-labelledby': 'floating-settings-title',
            }
          : {})}
      >
        <div
          id="floating-settings-panel"
          ref={panelRef}
          className={cn(
            'floating-settings-morph grid transition-[grid-template-rows]',
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] pointer-events-none',
          )}
          aria-hidden={!open}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="max-h-[min(70dvh,calc(100dvh-5.5rem),32rem)] overflow-y-auto overscroll-contain custom-scrollbar">
              {mounted ? <GlobalSettingsContent variant="floating" initialTab={tab} /> : null}
            </div>
          </div>
        </div>

        {open ? (
          <div className="flex h-14 w-full items-center gap-3 border-t border-border/60 px-4 text-primary">
            <Settings className="floating-settings-morph h-6 w-6 shrink-0 rotate-90" aria-hidden />
            <span
              id="floating-settings-title"
              className="flex-1 text-left text-base font-bold text-foreground"
            >
              {SETTINGS_COPY.panelTitle}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={hide}
              aria-label={SETTINGS_COPY.closeAria}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => show()}
            aria-expanded={false}
            aria-controls="floating-settings-panel"
            aria-label={SETTINGS_COPY.openAria}
            className="flex h-14 w-full items-center justify-center text-primary transition-colors"
          >
            <Settings className="floating-settings-morph h-6 w-6 shrink-0" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
