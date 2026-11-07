import { AdminApiError, type AdminRoom } from '@/lib/adminApi';

export const errorMessage = (e: unknown): string =>
  e instanceof AdminApiError ? e.message : 'Une erreur est survenue.';

export const STATUS_META: Record<
  string,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  waiting: {
    label: 'En attente',
    className: 'bg-secondary text-foreground',
    dot: 'bg-muted-foreground/40',
  },
  playing: {
    label: 'En partie',
    className: 'bg-success/20 text-success',
    dot: 'bg-success',
    pulse: true,
  },
  paused: { label: 'En pause', className: 'bg-warning/20 text-warning', dot: 'bg-warning' },
  finished: { label: 'Terminé', className: 'bg-info/20 text-info', dot: 'bg-info' },
};

export const statusMeta = (status: string) =>
  STATUS_META[status] ?? {
    label: status,
    className: 'bg-secondary text-foreground',
    dot: 'bg-muted-foreground/40',
  };

export const MODE_LABELS: Record<string, string> = {
  solo: 'Solo',
  multiplayer: 'Standard',
  competitive: 'Compétitif',
};

export const RESPONSE_LABELS: Record<string, string> = {
  typing: 'Typing',
  qcm: 'QCM',
  mix: 'Typing & QCM',
};

export const SELECTION_LABELS: Record<string, string> = {
  random: 'Aléatoire',
  mix: 'Mixte',
  watched: 'Watched',
  playlist: 'Playlist',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

export const formatDifficulties = (diffs: string[]): string => {
  if (!diffs.length) return 'Mixte';
  return diffs.map((d) => DIFFICULTY_LABELS[d] ?? d).join(', ');
};

/** Human-readable "open since" from an ISO timestamp. */
export const formatOpenSince = (iso: string, now: number): string => {
  const ms = now - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  if (h < 24) return rem ? `${h} h ${rem} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} j`;
};

// --- FILTERS / SORTS --------------------------------------------------------

export type FilterKey = 'all' | 'waiting' | 'playing' | 'public' | 'private';
export type SortKey = 'created' | 'players' | 'status';

export const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'waiting', label: 'En attente' },
  { key: 'playing', label: 'En partie' },
  { key: 'public', label: 'Publics' },
  { key: 'private', label: 'Privés' },
];

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'created', label: 'Ancienneté' },
  { key: 'players', label: 'Joueurs' },
  { key: 'status', label: 'Statut' },
];

export const STATUS_ORDER: Record<string, number> = {
  playing: 0,
  paused: 1,
  waiting: 2,
  finished: 3,
};

export const isPlaying = (r: AdminRoom) => r.status === 'playing' || r.status === 'paused';
export const connectedHumans = (r: AdminRoom) =>
  r.players.filter((p) => !p.isBot && p.isConnected).length;

export interface PendingConfirm {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<unknown>;
  successMsg: string;
}
