import { Check, Disc, Target, Trophy, Zap, type LucideIcon } from 'lucide-react';
import type { LeaderboardMetric } from '@aniquizz/shared';
import type { StatColorToken } from '@/features/profile/statColors';

/** Same icons and tokens as the profile stats / Pokédex sections. */
export const LEADERBOARD_METRIC_UI: Record<
  LeaderboardMetric,
  { icon: LucideIcon; color: StatColorToken }
> = {
  xp: { icon: Zap, color: 'text-primary' },
  victories: { icon: Trophy, color: 'text-accent' },
  games: { icon: Target, color: 'text-primary' },
  discoveries: { icon: Disc, color: 'text-accent' },
  accuracy: { icon: Check, color: 'text-success' },
};
