// Guessing-phase video presentation (26.1 #4). Reveal always shows full video.

export type VideoMode = 'hidden' | 'blurred' | 'peek';

/** Server-authoritative peek aperture (percent of the 16:9 stage). */
export interface PeekWindow {
  /** Left edge of the clear square, % of stage width. */
  xPercent: number;
  /** Top edge of the clear square, % of stage height. */
  yPercent: number;
  /** Square edge length as % of the stage short side (height). */
  sizePercent: number;
}

export const VIDEO_MODE_DEFAULT: VideoMode = 'hidden';

/** Peek square = 22 % of the short side; ≥ 8 % margin from each border. */
export const PEEK_SIZE_PERCENT = 22;
export const PEEK_MARGIN_PERCENT = 8;

/** French UI labels (isolated for future i18n). */
export const VIDEO_MODE_LABELS: Record<VideoMode, string> = {
  hidden: 'Audio seul',
  blurred: 'Vidéo floutée',
  peek: 'Fenêtre aléatoire',
};

export const VIDEO_MODE_DESCRIPTIONS: Record<VideoMode, string> = {
  hidden: 'Fond noir pendant le guess, audio seul.',
  blurred: 'La vidéo joue mais reste floutée jusqu\'à la révélation.',
  peek: 'Petit carré net à position aléatoire ; le reste est masqué.',
};

export function normalizeVideoMode(value: unknown): VideoMode {
  if (value === 'blurred' || value === 'peek') return value;
  return VIDEO_MODE_DEFAULT;
}

/**
 * Picks a random top-left position for the peek window.
 * `random` is injectable for tests (default Math.random).
 */
export function generatePeekWindow(random: () => number = Math.random): PeekWindow {
  const size = PEEK_SIZE_PERCENT;
  const margin = PEEK_MARGIN_PERCENT;
  const span = 100 - 2 * margin - size;
  if (span <= 0) {
    return { xPercent: margin, yPercent: margin, sizePercent: size };
  }
  const xPercent = margin + random() * span;
  const yPercent = margin + random() * span;
  return {
    xPercent: Math.round(xPercent * 100) / 100,
    yPercent: Math.round(yPercent * 100) / 100,
    sizePercent: size,
  };
}

/** CSS `clip-path: inset(...)` for a square peek on a 16:9 stage. */
export function peekClipPath(window: PeekWindow): string {
  const sizeH = window.sizePercent;
  const sizeW = (window.sizePercent * 9) / 16;
  const top = window.yPercent;
  const left = window.xPercent;
  const bottom = 100 - top - sizeH;
  const right = 100 - left - sizeW;
  return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
}

/** Percent-based box for positioning a peek frame overlay on the 16:9 stage. */
export function peekWindowRect(window: PeekWindow): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  return {
    left: window.xPercent,
    top: window.yPercent,
    width: (window.sizePercent * 9) / 16,
    height: window.sizePercent,
  };
}
