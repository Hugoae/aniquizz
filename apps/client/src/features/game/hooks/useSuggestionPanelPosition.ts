import { useEffect, useState, type RefObject } from 'react';

export interface SuggestionPanelPosition {
  left: number;
  width: number;
  maxHeight: number;
  bottom: number;
}

/** Fixed viewport coords for the autocomplete panel (escapes overflow-hidden game layout). */
export function useSuggestionPanelPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
): SuggestionPanelPosition | null {
  const [position, setPosition] = useState<SuggestionPanelPosition | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 8;
      const maxHeight = Math.min(240, Math.max(120, rect.top - gap - 16));
      setPosition({
        left: rect.left,
        width: rect.width,
        maxHeight,
        bottom: window.innerHeight - rect.top + gap,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, open]);

  return position;
}
