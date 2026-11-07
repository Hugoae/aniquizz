import { AdminApiError } from '@/lib/adminApi';
import type { SongDifficulty, SongStatus, SongType } from '@/lib/adminApi';

export const errMsg = (e: unknown) => (e instanceof AdminApiError ? e.message : 'Erreur.');

export const SONG_TYPES: SongType[] = ['OP', 'ED', 'INSERT'];
export const DIFFICULTIES: SongDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
export const STATUSES: SongStatus[] = ['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR', 'SKIPPED'];

export const toList = (s: string): string[] =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export const numOrNull = (s: string): number | null => {
  const n = Number(s);
  return s.trim() === '' || Number.isNaN(n) ? null : n;
};

export const selectCls = 'w-full rounded border border-border bg-background px-2 py-2 text-sm';
