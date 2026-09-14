const GAP = 4;
const VIEWPORT_MARGIN = 12;
const MAX_HEIGHT = 360;
/** Flip above the field when the leftover viewport below cannot show a usable list. */
const MIN_BELOW = 160;

export interface DailySongSearchPanelBox {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

/** Viewport-fixed listbox: drop down when there is room, otherwise grow upward. */
export function placeDailySongSearchPanel(
  rect: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>,
  viewportHeight: number,
): DailySongSearchPanelBox {
  const spaceBelow = Math.max(0, viewportHeight - rect.bottom - VIEWPORT_MARGIN);
  const spaceAbove = Math.max(0, rect.top - VIEWPORT_MARGIN);
  const openUp = spaceBelow < MIN_BELOW && spaceAbove > spaceBelow;

  if (openUp) {
    return {
      bottom: viewportHeight - rect.top + GAP,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(MAX_HEIGHT, spaceAbove),
    };
  }

  return {
    top: rect.bottom + GAP,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.min(MAX_HEIGHT, spaceBelow),
  };
}
