import { getMedalMeta, type Medal } from '@aniquizz/shared';
import { pick } from '@/lib/i18n/text';

const MEDAL_EN: Record<Medal, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/** Shared medal names stay French. The player UI reads this instead. */
export function medalDisplayLabel(tier: Medal): string {
  return pick(getMedalMeta(tier)?.label ?? tier, MEDAL_EN[tier]);
}
