import type { StatsPeriod } from '@/lib/adminApi';

export const PERIODS: { key: StatsPeriod; label: string }[] = [
  { key: '24h', label: '24 h' },
  { key: '7d', label: '7 j' },
  { key: '30d', label: '30 j' },
  { key: 'all', label: 'Tout' },
];

/** "sur …" suffix for period-scoped metrics. */
export const PERIOD_TEXT: Record<StatsPeriod, string> = {
  '24h': '24 h',
  '7d': '7 j',
  '30d': '30 j',
  all: "tout l'historique",
};

export const PERIOD_SHORT: Record<StatsPeriod, string> = {
  '24h': '24 h',
  '7d': '7 j',
  '30d': '30 j',
  all: 'total',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: 'Facile',
  MEDIUM: 'Moyen',
  HARD: 'Difficile',
};

export const MODE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  SPRINT: 'Vitesse',
  TIME_ATTACK: 'Contre-la-montre',
};

export const formatUptime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
