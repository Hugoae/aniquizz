import type { LucideIcon } from 'lucide-react';
import { ListMusic, Clock, Target, Mic2, Shuffle } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';

/**
 * Shared room-settings display helpers, used by both the room list and the
 * lobby header so the difficulty badge + setting chips stay visually identical
 * and defined in a single place (design tokens only).
 */

export type SettingTone = 'accent' | 'warning' | 'primary' | 'aqua' | 'info' | 'success' | 'destructive' | 'neutral';

export const SETTING_TONE_CLASSES: Record<SettingTone, string> = {
  accent: 'border-accent/20 bg-accent/10 text-accent',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  primary: 'border-primary/20 bg-primary/10 text-primary',
  aqua: 'border-aqua/20 bg-aqua/10 text-aqua',
  info: 'border-info/20 bg-info/10 text-info',
  success: 'border-success/20 bg-success/10 text-success',
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
  neutral: 'border-border/50 bg-secondary/30 text-muted-foreground',
};

/** Difficulty chip: single tiers use a solid token color, combos use a token gradient. */
export function getDifficultyBadge(diffs: string[] = []): { label: string; className: string } {
  const hasEasy = diffs.includes('easy');
  const hasMedium = diffs.includes('medium');
  const hasHard = diffs.includes('hard');

  if (diffs.length === 0) return { label: 'Mixte', className: 'bg-info/10 text-info border-info/20' };

  if (hasEasy && hasMedium && hasHard)
    return { label: 'Tout', className: 'bg-gradient-to-r from-success/80 via-info/80 to-destructive/80 text-white border-transparent' };
  if (hasEasy && hasMedium)
    return { label: 'Facile & Moyen', className: 'bg-gradient-to-r from-success/80 to-info/80 text-white border-transparent' };
  if (hasMedium && hasHard)
    return { label: 'Moyen & Diff.', className: 'bg-gradient-to-r from-info/80 to-destructive/80 text-white border-transparent' };
  if (hasEasy && hasHard)
    return { label: 'Facile & Diff.', className: 'bg-gradient-to-r from-success/80 to-destructive/80 text-white border-transparent' };

  if (hasEasy) return { label: 'Facile', className: 'bg-success/10 text-success border-success/20' };
  if (hasMedium) return { label: 'Moyen', className: 'bg-info/10 text-info border-info/20' };
  if (hasHard) return { label: 'Difficile', className: 'bg-destructive/10 text-destructive border-destructive/20' };

  return { label: 'Mixte', className: 'bg-info/10 text-info border-info/20' };
}

export interface SettingBadgeSpec {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone: SettingTone;
}

/** The non-difficulty settings chips shared across the lobby + room list. */
export function buildRoomSettingBadges(
  s: Pick<GameConfig, 'soundCount' | 'guessDuration' | 'precision' | 'responseType' | 'soundSelection'>,
): SettingBadgeSpec[] {
  return [
    { key: 'sounds', icon: ListMusic, label: 'Sons', value: String(s.soundCount), tone: 'accent' },
    { key: 'time', icon: Clock, label: 'Temps', value: `${s.guessDuration}s`, tone: 'warning' },
    { key: 'precision', icon: Target, label: 'Mode', value: s.precision === 'exact' ? 'Nom exact' : 'Franchise', tone: 'primary' },
    { key: 'type', icon: Mic2, label: 'Type', value: s.responseType === 'mix' ? 'Mix' : s.responseType.toUpperCase(), tone: 'aqua' },
    { key: 'source', icon: Shuffle, label: 'Source', value: s.soundSelection === 'watched' ? 'Ma liste' : 'Aléatoire', tone: 'info' },
  ];
}
