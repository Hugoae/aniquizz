import { Search } from 'lucide-react';
import type { LibraryDifficulty, LibraryDiscoveredFilter, LibrarySort, LibrarySongType } from '@aniquizz/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LIBRARY_COPY, LIBRARY_SORT_OPTIONS } from '@/features/library/copy/libraryCopy';
import {
  filterSelectClass,
  libraryDifficultyFilterClass,
  libraryDifficultyLabel,
} from '@/features/library/lib/libraryStyles';

const TYPE_OPTIONS: Array<{ value: LibrarySongType; label: string }> = [
  { value: 'OP', label: LIBRARY_COPY.typeOp },
  { value: 'ED', label: LIBRARY_COPY.typeEd },
  { value: 'INSERT', label: LIBRARY_COPY.typeInsert },
];

const DIFFICULTY_OPTIONS: LibraryDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const DISCOVERED_OPTIONS: Array<{ value: LibraryDiscoveredFilter | ''; label: string }> = [
  { value: '', label: LIBRARY_COPY.filterDiscoveredAll },
  { value: 'heard', label: LIBRARY_COPY.filterDiscoveredHeard },
  { value: 'unheard', label: LIBRARY_COPY.filterDiscoveredUnheard },
];

function FilterSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

interface LibraryFiltersProps {
  rawQuery: string;
  onQueryChange: (q: string) => void;
  songTypes: LibrarySongType[];
  onToggleSongType: (t: LibrarySongType) => void;
  difficulties: LibraryDifficulty[];
  onToggleDifficulty: (d: LibraryDifficulty) => void;
  discovered: LibraryDiscoveredFilter | '';
  onDiscoveredChange: (d: LibraryDiscoveredFilter | '') => void;
  isAuthenticated: boolean;
  sort: LibrarySort;
  onSortChange: (s: LibrarySort) => void;
  resultCount: number | null;
  searchMode: boolean;
}

export function LibraryFilters({
  rawQuery,
  onQueryChange,
  songTypes,
  onToggleSongType,
  difficulties,
  onToggleDifficulty,
  discovered,
  onDiscoveredChange,
  isAuthenticated,
  sort,
  onSortChange,
  resultCount,
  searchMode,
}: LibraryFiltersProps) {
  return (
    <section className="glass-card space-y-4 p-4 md:p-5" aria-label="Filtres de la librairie">
      <FilterSection title={LIBRARY_COPY.filterSectionSearch}>
        <div className="relative w-full">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={rawQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={LIBRARY_COPY.searchPlaceholder}
            className="h-11 w-full pl-10 bg-card/60 border-border/70"
            aria-label={LIBRARY_COPY.searchPlaceholder}
          />
        </div>
      </FilterSection>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FilterSection title={LIBRARY_COPY.filterSectionTypes}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={LIBRARY_COPY.filterSectionTypes}>
            {TYPE_OPTIONS.map((opt) => {
              const active = songTypes.includes(opt.value);
              return (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className={cn('h-9 px-3 text-xs font-semibold', !active && 'bg-card/60')}
                  aria-pressed={active}
                  onClick={() => onToggleSongType(opt.value)}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection title={LIBRARY_COPY.filterSectionDifficulty}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={LIBRARY_COPY.filterSectionDifficulty}>
            {DIFFICULTY_OPTIONS.map((diff) => {
              const active = difficulties.includes(diff);
              return (
                <button
                  key={diff}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleDifficulty(diff)}
                  className={cn(
                    'h-9 rounded-lg border px-3 text-xs font-bold uppercase tracking-wide transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    libraryDifficultyFilterClass(diff, active),
                  )}
                >
                  {libraryDifficultyLabel(diff)}
                </button>
              );
            })}
          </div>
        </FilterSection>

        {isAuthenticated ? (
          <FilterSection title={LIBRARY_COPY.filterSectionDiscovered}>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={LIBRARY_COPY.filterSectionDiscovered}>
              {DISCOVERED_OPTIONS.map((opt) => {
                const active = discovered === opt.value;
                return (
                  <Button
                    key={opt.value || 'all'}
                    type="button"
                    size="sm"
                    variant={active ? 'secondary' : 'outline'}
                    className={cn('h-9 px-3 text-xs font-semibold', !active && 'bg-card/60')}
                    aria-pressed={active}
                    onClick={() => onDiscoveredChange(opt.value)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </FilterSection>
        ) : null}

        <FilterSection
          title={LIBRARY_COPY.filterSectionSort}
          className={isAuthenticated ? undefined : 'sm:col-span-2 xl:col-span-1'}
        >
          <select
            id="library-sort"
            className={cn(filterSelectClass, 'h-9 w-full min-w-0')}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as LibrarySort)}
            aria-label={LIBRARY_COPY.filterSectionSort}
          >
            {LIBRARY_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FilterSection>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-3">
        {resultCount !== null && (
          <p className="text-xs font-medium text-muted-foreground">{LIBRARY_COPY.resultsCount(resultCount)}</p>
        )}
        {searchMode && (
          <p className="text-xs text-muted-foreground">{LIBRARY_COPY.searchModeHint}</p>
        )}
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground">{LIBRARY_COPY.filterDiscoveredLoginHint}</p>
        )}
      </div>
    </section>
  );
}
