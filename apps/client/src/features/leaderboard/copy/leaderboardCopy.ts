import type { LeaderboardEntry, LeaderboardMetric } from '@aniquizz/shared';
import { LEADERBOARD_DEFAULT_PAGE_SIZE } from '@aniquizz/shared';
import { formatAppNumber } from '@/lib/i18n/format';
import { extendLive, liveStrings, tx } from '@/lib/i18n/text';

const keys = [
  'title',
  'eyebrow',
  'subtitle',
  'back',
  'loadError',
  'retry',
  'emptyTitle',
  'emptyHint',
  'rankedCount',
  'playCta',
  'you',
  'tied',
  'loginToCompare',
  'loginToProfile',
  'backToBoard',
  'unranked',
  'loadingAria',
  'tabsAria',
] as const;

export const LEADERBOARD_COPY = extendLive(liveStrings('leaderboard', '', keys), {
  moreTied: (count: number) => tx('leaderboard', 'moreTied', { count }),
  viewProfileOf: (name: string) => tx('leaderboard', 'viewProfileOf', { name }),
  get outsideTop() {
    return tx('leaderboard', 'outsideTop', { size: LEADERBOARD_DEFAULT_PAGE_SIZE });
  },
  ineligible: (current: number, required: number) =>
    tx('leaderboard', 'ineligible', {
      count: Math.max(required - current, 0),
      remaining: formatAppNumber(Math.max(required - current, 0)),
      current: formatAppNumber(current),
      required: formatAppNumber(required),
    }),
  level: (level: number) => tx('leaderboard', 'level', { level }),
  metrics: {
    xp: liveStrings('leaderboard', 'metrics.xp', ['label', 'hint'] as const),
    victories: liveStrings('leaderboard', 'metrics.victories', ['label', 'hint'] as const),
    games: liveStrings('leaderboard', 'metrics.games', ['label', 'hint'] as const),
    discoveries: liveStrings('leaderboard', 'metrics.discoveries', ['label', 'hint'] as const),
    accuracy: liveStrings('leaderboard', 'metrics.accuracy', ['label', 'hint'] as const),
  } satisfies Record<LeaderboardMetric, { label: string; hint: string }>,
});

const n = (value: number) => formatAppNumber(value);

export const formatLeaderboardValue = (entry: LeaderboardEntry): string => {
  switch (entry.metric) {
    case 'xp':
      return tx('leaderboard', 'xpValue', { formatted: n(entry.xp) });
    case 'victories':
      return n(entry.gamesWon);
    case 'games':
      return n(entry.gamesPlayed);
    case 'discoveries':
      return n(entry.discoveries);
    case 'accuracy':
      return tx('leaderboard', 'accuracyValue', {
        formatted: formatAppNumber(entry.accuracy, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      });
  }
};

export const formatLeaderboardDetail = (entry: LeaderboardEntry): string | null => {
  switch (entry.metric) {
    case 'victories':
      return tx('leaderboard', 'detailVictories', {
        count: entry.gamesPlayed,
        formatted: n(entry.gamesPlayed),
        rate: entry.winRate,
      });
    case 'accuracy':
      return `${n(entry.correctGuesses)} / ${n(entry.totalGuesses)}`;
    default:
      return null;
  }
};

export const formatLeaderboardAnnouncement = (entry: LeaderboardEntry): string => {
  switch (entry.metric) {
    case 'victories': {
      const wins = tx('leaderboard', 'wins', {
        count: entry.gamesWon,
        formatted: n(entry.gamesWon),
      });
      const detail = formatLeaderboardDetail(entry);
      return detail ? `${wins}, ${detail}` : wins;
    }
    case 'games':
      return tx('leaderboard', 'games', {
        count: entry.gamesPlayed,
        formatted: n(entry.gamesPlayed),
      });
    case 'discoveries':
      return tx('leaderboard', 'discoveries', {
        count: entry.discoveries,
        formatted: n(entry.discoveries),
      });
    default: {
      const detail = formatLeaderboardDetail(entry);
      return detail ? `${formatLeaderboardValue(entry)}, ${detail}` : formatLeaderboardValue(entry);
    }
  }
};
