import type { LibraryDifficulty } from '@aniquizz/shared';

export function toLibraryDifficulty(value: string): LibraryDifficulty {
  const upper = value.toUpperCase();
  if (upper === 'EASY' || upper === 'HARD') return upper;
  return 'MEDIUM';
}

export function formatDailyAdminDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00.000Z`));
}

export function dailyAttemptLabel(
  count: number,
  copy: { attemptsNone: string; attemptsOne: string; attemptsMany: (n: number) => string },
): string {
  if (count <= 0) return copy.attemptsNone;
  if (count === 1) return copy.attemptsOne;
  return copy.attemptsMany(count);
}

export function formatClipTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
