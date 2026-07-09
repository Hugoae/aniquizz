import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function HeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md md:px-6',
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-28" />
      </div>
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
  );
}

/** Landing `/` — matches the fixed-viewport hero layout. */
export function HomeRouteSkeleton() {
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background" aria-busy="true" aria-label="Chargement">
      <HeaderSkeleton />
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-16">
        <Skeleton className="mb-5 h-9 w-64 rounded-full" />
        <Skeleton className="mb-4 h-14 w-[min(100%,36rem)] max-w-xl" />
        <Skeleton className="mb-3 h-14 w-[min(100%,28rem)] max-w-lg" />
        <Skeleton className="mb-8 h-5 w-[min(100%,24rem)] max-w-md" />
        <Skeleton className="mb-4 h-14 w-44 rounded-xl" />
        <div className="flex gap-3">
          <Skeleton className="h-11 w-32 rounded-lg" />
          <Skeleton className="h-11 w-36 rounded-lg" />
        </div>
      </main>
    </div>
  );
}

/** Play hub — mode cards / lobby shell. */
export function HubRouteSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background" aria-busy="true" aria-label="Chargement">
      <HeaderSkeleton />
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-24">
        <Skeleton className="mx-auto mb-8 h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl sm:col-span-2 lg:col-span-1" />
        </div>
        <Skeleton className="mt-8 h-48 w-full rounded-2xl" />
      </main>
    </div>
  );
}

/** In-game shell — top bar + stage placeholder. */
export function GameRouteSkeleton() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background" aria-busy="true" aria-label="Chargement">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex flex-1 flex-col items-center gap-6 p-4 pt-8">
        <Skeleton className="aspect-video w-full max-w-3xl rounded-xl" />
        <Skeleton className="h-14 w-full max-w-xl rounded-lg" />
      </div>
    </div>
  );
}

/** Profile / admin — sidebar-style content blocks. */
export function ProfileRouteSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background" aria-busy="true" aria-label="Chargement">
      <HeaderSkeleton />
      <main className="mx-auto max-w-4xl px-4 pb-10 pt-24">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-36 rounded-xl sm:col-span-2" />
        </div>
      </main>
    </div>
  );
}

export function NewsRouteSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background" aria-busy="true" aria-label="Chargement">
      <HeaderSkeleton />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24">
        <Skeleton className="mb-6 h-10 w-48" />
        <div className="mb-6 flex gap-2">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </main>
    </div>
  );
}

export function DefaultRouteSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background" aria-busy="true" aria-label="Chargement">
      <HeaderSkeleton />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-24 space-y-4">
        <Skeleton className="h-10 w-2/3 max-w-sm" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      </main>
    </div>
  );
}

/** Picks a layout-aware skeleton from the current path (Suspense + auth gate). */
export function RouteSkeletonFallback() {
  const { pathname } = useLocation();

  if (pathname === '/') return <HomeRouteSkeleton />;
  if (pathname.startsWith('/play')) return <HubRouteSkeleton />;
  if (pathname.startsWith('/game')) return <GameRouteSkeleton />;
  if (pathname.startsWith('/profile') || pathname.startsWith('/admin')) return <ProfileRouteSkeleton />;
  if (pathname.startsWith('/news')) return <NewsRouteSkeleton />;

  return <DefaultRouteSkeleton />;
}

/**
 * Suspense fallback for lazy route chunks. Renders nothing for a short grace
 * period so a prefetched/cached chunk (which resolves in a few ms) swaps in with
 * no visible skeleton flash. The skeleton only appears if the chunk genuinely
 * takes longer than the delay to load (slow network / cold cache).
 */
export function DelayedRouteFallback({ delay = 220 }: { delay?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);

  if (!visible) return null;
  return <RouteSkeletonFallback />;
}
