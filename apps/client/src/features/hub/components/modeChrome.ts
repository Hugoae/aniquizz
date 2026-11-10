import type { GameType } from '@aniquizz/shared';

/**
 * One color per mode, everywhere a tag or a selected card shows it.
 * Violet, cyan, green, gold — existing tokens, not new hues.
 */
export const MODE_CHROME = {
  standard: {
    solid: 'bg-primary text-primary-foreground',
    selected: 'border-primary/50 bg-primary/10',
    icon: 'text-primary',
    fillIcon: true,
  },
  timeAttack: {
    solid: 'bg-aqua text-aqua-foreground',
    selected: 'border-aqua/50 bg-aqua/10',
    icon: 'text-aqua',
    fillIcon: false,
  },
  evolving: {
    solid: 'bg-success text-success-foreground',
    selected: 'border-success/50 bg-success/10',
    icon: 'text-success',
    fillIcon: false,
  },
  daily: {
    solid: 'bg-warning text-warning-foreground',
    selected: 'border-warning/50 bg-warning/10',
    icon: 'text-warning',
    fillIcon: false,
  },
} as const;

export function modeChrome(gameType: GameType) {
  return MODE_CHROME[gameType];
}
