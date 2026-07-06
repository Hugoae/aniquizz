import type { PresenceStatus } from '@aniquizz/shared';

/** Presence dot colors keyed by status. */
export const PRESENCE_DOT: Record<PresenceStatus, string> = {
  in_game: 'bg-amber-400',
  in_lobby: 'bg-sky-400',
  online: 'bg-green-500',
  offline: 'bg-muted-foreground/40',
};

/** Human-friendly presence label (FR). */
export function presenceLabel(status: PresenceStatus): string {
  switch (status) {
    case 'in_game':
      return 'En jeu';
    case 'in_lobby':
      return 'Dans un salon';
    case 'online':
      return 'En ligne';
    default:
      return 'Hors ligne';
  }
}

/** "Vu il y a X" relative time from an ISO timestamp. */
export function formatLastSeen(iso: string | null): string {
  if (!iso) return 'Jamais vu';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Vu à l'instant";
  if (min < 60) return `Vu il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Vu il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Vu il y a ${d} j`;
  const mo = Math.floor(d / 30);
  return `Vu il y a ${mo} mois`;
}
