/**
 * Shared helpers for moderation sanctions (ban / mute) on the client.
 * Durations are expressed in minutes to match the admin API contract.
 */

import { useEffect, useState } from "react";

export interface DurationOption {
  label: string;
  minutes: number;
}

/** "Permanent" is modelled as ~100 years (matches the server upper bound). */
export const PERMANENT_MINUTES = 52_560_000;

/** Above this remaining duration we display the sanction as permanent. */
const PERMANENT_THRESHOLD_MS = 50 * 365 * 24 * 60 * 60 * 1000;

export const DURATION_OPTIONS: DurationOption[] = [
  { label: "1 heure", minutes: 60 },
  { label: "2 heures", minutes: 120 },
  { label: "12 heures", minutes: 720 },
  { label: "24 heures", minutes: 1440 },
  { label: "1 semaine", minutes: 10080 },
  { label: "1 mois", minutes: 43200 },
  { label: "Définitif", minutes: PERMANENT_MINUTES },
];

export const isSanctionActive = (until: string | null | undefined): boolean =>
  !!until && new Date(until).getTime() > Date.now();

/** Compact "vu il y a X" style relative time in French. */
export const formatRelativeFromNow = (iso: string | null | undefined): string => {
  if (!iso) return "jamais vu";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "à l'instant";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an(s)`;
};

/**
 * Human-readable remaining time until `until` (French, UI-facing).
 * Returns "Définitif" for very long sanctions and "" when already expired.
 */
export const formatRemaining = (until: string | null | undefined): string => {
  if (!until) return "";
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "";
  if (ms >= PERMANENT_THRESHOLD_MS) return "Définitif";

  const totalMinutes = Math.ceil(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
};

/** Re-render every second while a sanction countdown is visible. */
export function useSanctionTicker(active: boolean): void {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
}
