import { Skeleton } from '@/components/ui/skeleton';

// Layout-matching placeholder shown while the profile + stats load, so the page
// doesn't jump when the real content arrives.
export function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-card p-8">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <Skeleton className="h-32 w-32 rounded-full shrink-0" />
          <div className="flex-1 w-full space-y-3">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-2.5 w-full max-w-md rounded-full" />
          </div>
          <div className="flex flex-col gap-3 w-full md:w-40">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-9 space-y-8">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <Skeleton className="h-[480px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
