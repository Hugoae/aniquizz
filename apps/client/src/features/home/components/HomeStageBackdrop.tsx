import { useEffect, useRef } from 'react';

const STAR_AREA = 140000;
const CLEAR_PAD = 14;

type Star = {
  x: number;
  y: number;
  r: number;
  born: number;
  life: number;
  fadeIn: number;
  fadeOut: number;
  peak: number;
};

function motionReduced(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-motion') === 'reduced') return true;
  if (document.documentElement.getAttribute('data-motion') === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clearRects(): DOMRect[] {
  return [...document.querySelectorAll<HTMLElement>('[data-home-clear]')].map((node) =>
    node.getBoundingClientRect(),
  );
}

function hitsClear(x: number, y: number, r: number, rects: DOMRect[]): boolean {
  return rects.some(
    (rect) =>
      x >= rect.left - CLEAR_PAD - r &&
      x <= rect.right + CLEAR_PAD + r &&
      y >= rect.top - CLEAR_PAD - r &&
      y <= rect.bottom + CLEAR_PAD + r,
  );
}

function spawnStar(
  star: Star,
  width: number,
  height: number,
  now: number,
  scatter: boolean,
  rects: DOMRect[],
): void {
  // Skew toward small points, with a few clearly larger ones.
  star.r = 0.7 + Math.random() ** 1.7 * 3.4;
  star.life = 1100 + Math.random() * 1300;
  star.fadeIn = 140 + Math.random() * 160;
  star.fadeOut = 180 + Math.random() * 220;
  star.peak = 0.45 + Math.random() * 0.55;
  star.born = scatter ? now - Math.random() * star.life : now;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    star.x = Math.random() * width;
    star.y = Math.random() * height;
    if (!hitsClear(star.x, star.y, star.r, rects)) return;
  }
  star.x = -40;
  star.y = -40;
}

function starAlpha(star: Star, now: number): number {
  const age = now - star.born;
  if (age >= star.life) return -1;
  if (age < star.fadeIn) return (age / star.fadeIn) * star.peak;
  if (age > star.life - star.fadeOut) return ((star.life - age) / star.fadeOut) * star.peak;
  return star.peak;
}

/** A few white points that blink, then reappear somewhere else. */
export function HomeStageBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let frame = 0;
    let stars: Star[] = [];
    let ink = '0 0% 100%';

    const readInk = () => {
      ink =
        getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() || ink;
    };

    const layout = (scatter: boolean) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      readInk();
      const count = Math.round(Math.min(16, Math.max(7, (width * height) / STAR_AREA)));
      const now = performance.now();
      stars = Array.from({ length: count }, () => {
        const star = {} as Star;
        spawnStar(star, width, height, now, scatter, clearRects());
        return star;
      });
    };

    const paint = (now: number) => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const reduced = motionReduced();
      const rects = clearRects();
      context.clearRect(0, 0, width, height);
      for (const star of stars) {
        const alpha = reduced ? star.peak * 0.45 : starAlpha(star, now);
        if (alpha < 0) {
          spawnStar(star, width, height, now, false, rects);
          continue;
        }
        if (alpha < 0.04 || hitsClear(star.x, star.y, star.r, rects)) continue;
        context.fillStyle = `hsl(${ink} / ${alpha})`;
        context.beginPath();
        context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        context.fill();
      }
    };

    const tick = (now: number) => {
      if (!document.hidden) paint(now);
      if (!motionReduced()) frame = window.requestAnimationFrame(tick);
    };

    layout(true);
    frame = window.requestAnimationFrame(tick);
    const onResize = () => layout(false);
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
