import { ChevronLeft, ChevronRight, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';

interface LibraryPaginationBarProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function LibraryPaginationBar({ page, totalPages, onPageChange }: LibraryPaginationBarProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageWindow(page, totalPages);

  return (
    <Pagination className="pt-2">
      <PaginationContent>
        <PaginationItem>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </PaginationItem>

        {pages.map((p, idx) =>
          p === '…' ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <span className="px-2 text-muted-foreground">…</span>
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === page}
                onClick={() => onPageChange(p)}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function buildPageWindow(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 3) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

export function LibraryGridSkeleton() {
  return <LibraryListSkeleton />;
}

export function LibraryListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="glass-card h-14 animate-pulse rounded-xl bg-secondary/30" />
      ))}
    </div>
  );
}

export function LibraryEmptyState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 rounded-2xl border-dashed px-6 py-16 text-center">
      <Music2 className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
      <p className="font-semibold text-foreground">{LIBRARY_COPY.emptyTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{LIBRARY_COPY.emptyHint}</p>
    </div>
  );
}
