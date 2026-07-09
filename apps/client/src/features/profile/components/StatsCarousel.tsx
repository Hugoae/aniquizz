import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatColorToken } from '@/features/profile/statColors';

export interface StatItem {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: StatColorToken;
}

// Tiles per page follow the same breakpoints as the grid below (2×2 / 3×2 / 4×2),
// so JS chunking and the CSS grid stay in sync.
function usePageSize(): number {
  const get = () => {
    if (typeof window === 'undefined') return 8;
    const w = window.innerWidth;
    if (w < 640) return 4;
    if (w < 768) return 6;
    return 8;
  };
  const [size, setSize] = useState(get);
  useEffect(() => {
    const onResize = () => setSize(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

function StatTile({ item }: { item: StatItem }) {
  const Icon = item.icon;
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card/40 p-4 transition-colors hover:bg-card/60">
      <div className={cn('absolute right-2.5 top-2.5 rounded-lg bg-secondary p-1.5 opacity-80 transition-all group-hover:scale-110 group-hover:opacity-100', item.color)}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className={cn('font-mono text-2xl font-bold leading-none', item.color)}>{item.value}</div>
      <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {item.label}
      </div>
    </div>
  );
}

export function StatsCarousel({ items }: { items: StatItem[] }) {
  const pageSize = usePageSize();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const pages = useMemo(() => {
    const out: StatItem[][] = [];
    for (let i = 0; i < items.length; i += pageSize) out.push(items.slice(i, i + pageSize));
    return out;
  }, [items, pageSize]);

  // Keep the active page valid when the page size (breakpoint) changes.
  useEffect(() => {
    if (page > pages.length - 1) setPage(Math.max(0, pages.length - 1));
  }, [pages.length, page]);

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, pages.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' });
    setPage(clamped);
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const current = Math.round(el.scrollLeft / el.clientWidth);
    if (current !== page) setPage(current);
  };

  const multiPage = pages.length > 1;

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        aria-label="Statistiques du profil"
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((pageItems, i) => (
          <div key={i} className="w-full shrink-0 snap-start">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {pageItems.map((item) => (
                <StatTile key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {multiPage && (
        <>
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page === 0}
            aria-label="Statistiques précédentes"
            className="absolute -left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-popover/90 p-1.5 text-muted-foreground shadow-card backdrop-blur-md transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30 md:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page === pages.length - 1}
            aria-label="Statistiques suivantes"
            className="absolute -right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-popover/90 p-1.5 text-muted-foreground shadow-card backdrop-blur-md transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30 md:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Page ${i + 1}`}
                aria-current={i === page}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === page ? 'w-5 bg-primary' : 'w-1.5 bg-muted hover:bg-muted-foreground/40',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
