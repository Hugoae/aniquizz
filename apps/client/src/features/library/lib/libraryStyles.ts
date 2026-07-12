import type { LibraryDifficulty } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';

export function libraryDifficultyFilterClass(
  difficulty: LibraryDifficulty,
  active: boolean,
): string {
  const idle = 'border-border/60 bg-card/60 text-muted-foreground hover:bg-secondary/40';
  if (!active) return idle;
  switch (difficulty) {
    case 'EASY':
      return 'border-success bg-success/15 text-success shadow-sm';
    case 'HARD':
      return 'border-destructive bg-destructive/15 text-destructive shadow-sm';
    default:
      return 'border-warning bg-warning/15 text-warning shadow-sm';
  }
}

export function libraryDifficultyLabel(difficulty: LibraryDifficulty): string {
  switch (difficulty) {
    case 'EASY':
      return LIBRARY_COPY.diffEasy;
    case 'HARD':
      return LIBRARY_COPY.diffHard;
    default:
      return LIBRARY_COPY.diffMedium;
  }
}

export function libraryDifficultyClass(difficulty: LibraryDifficulty): string {
  switch (difficulty) {
    case 'EASY':
      return 'text-success border-success/30 bg-success/10';
    case 'HARD':
      return 'text-destructive border-destructive/30 bg-destructive/10';
    default:
      return 'text-warning border-warning/30 bg-warning/10';
  }
}

export function librarySongTypeLabel(type: string, sequence: number): string {
  return `${type}${sequence}`;
}

export const filterSelectClass = cn(
  'h-9 rounded-lg border border-border bg-card/80 px-3 text-sm text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
);
