import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';
import { libraryAnimeSongsHref } from '@/features/library/lib/libraryBrowseParams';

export function LibraryNestedMoreLink({
  animeId,
  shown,
  total,
  className,
}: {
  animeId: number;
  shown: number;
  total: number;
  className?: string;
}) {
  const hidden = total - shown;
  if (hidden <= 0) return null;
  return (
    <li>
      <Link
        to={libraryAnimeSongsHref(animeId)}
        className={cn(
          'block px-4 py-2.5 text-sm text-primary hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          className,
        )}
      >
        {LIBRARY_COPY.nestedSeeAll(hidden)}
      </Link>
    </li>
  );
}
