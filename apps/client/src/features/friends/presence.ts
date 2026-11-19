import type { PresenceStatus } from '@aniquizz/shared';
import { pick } from '@/lib/i18n/text';

/** Presence dot colors keyed by status (design tokens). */
export const PRESENCE_DOT: Record<PresenceStatus, string> = {
  in_game: 'bg-warning',
  in_lobby: 'bg-aqua',
  online: 'bg-success',
  hidden: 'bg-muted-foreground/40',
  offline: 'bg-muted-foreground/40',
};

/** Human-friendly presence label (FR). */
export function presenceLabel(status: PresenceStatus): string {
  switch (status) {
    case 'in_game':
      return pick('En jeu', 'In a match');
    case 'in_lobby':
      return pick('Dans un salon', 'In a room');
    case 'online':
      return pick('En ligne', 'Online');
    case 'hidden':
      return pick('Statut masqué', 'Status hidden');
    default:
      return pick('Hors ligne', 'Offline');
  }
}

/** "Vu il y a X" relative time from an ISO timestamp. */
export function formatLastSeen(iso: string | null): string {
  if (!iso) return pick('Jamais vu', 'Never seen');
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return pick("Vu à l'instant", 'Seen just now');
  if (min < 60) return pick(`Vu il y a ${min} min`, `Seen ${min} min ago`);
  const h = Math.floor(min / 60);
  if (h < 24) return pick(`Vu il y a ${h} h`, `Seen ${h} h ago`);
  const d = Math.floor(h / 24);
  if (d < 30) return pick(`Vu il y a ${d} j`, `Seen ${d} d ago`);
  const mo = Math.floor(d / 30);
  return pick(`Vu il y a ${mo} mois`, `Seen ${mo} mo ago`);
}
