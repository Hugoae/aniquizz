import { extendLive, liveStrings, tx } from '@/lib/i18n/text';

export const GAME_COPY = {
  missingRoom: liveStrings('game', 'missingRoom', ['title', 'body', 'cta'] as const),
  loading: liveStrings('game', 'loading', [
    'status',
    'title',
    'preparing',
    'headphones',
    'go',
    'cancel',
    'leaveSalon',
  ] as const),
  results: liveStrings('game', 'results', ['loading'] as const),
  leaveMatch: liveStrings('game', 'leaveMatch', [
    'title',
    'returnLobbyLead',
    'returnLobbyBody',
    'leaveSalonLead',
    'leaveSalonBody',
    'cancel',
    'returnCta',
    'leaveCta',
  ] as const),
  leaveSalon: liveStrings('game', 'leaveSalon', [
    'title',
    'profile',
    'confirmProfile',
    'confirm',
    'cancel',
  ] as const),
  consequences: liveStrings('game', 'consequences', ['solo', 'multi'] as const),
  toasts: liveStrings('game', 'toasts', [
    'playlistInfo',
    'cancelledHost',
    'roomClosed',
    'genericError',
  ] as const),
  config: liveStrings('game', 'config', ['varied', 'standard', 'me'] as const),
  stage: liveStrings('game', 'stage', ['pauseEndOfRound'] as const),
  stageFeedback: extendLive(
    liveStrings('game', 'stageFeedback', ['correct', 'missed', 'wrong'] as const),
    {
      announce: {
        get correct() {
          return tx('game', 'stageFeedback.announceCorrect');
        },
        get wrong() {
          return tx('game', 'stageFeedback.announceWrong');
        },
        get wrongPlain() {
          return tx('game', 'stageFeedback.announceWrongPlain');
        },
        get skip() {
          return tx('game', 'stageFeedback.announceSkip');
        },
        get skipPlain() {
          return tx('game', 'stageFeedback.announceSkipPlain');
        },
        get missed() {
          return tx('game', 'stageFeedback.announceMissed');
        },
        bonus: (seconds: number) => tx('game', 'stageFeedback.announceBonus', { seconds }),
      },
    },
  ),
  recentTitles: extendLive(liveStrings('game', 'recentTitles', ['heading', 'empty'] as const), {
    outcome: liveStrings('game', 'recentTitles', ['found', 'missed', 'skipped'] as const),
    bonus: (seconds: number) => tx('game', 'recentTitles.bonus', { seconds }),
    bonusSpoken: (seconds: number) => tx('game', 'recentTitles.bonusSpoken', { seconds }),
  }),
  timeAttack: {
    clockAria: (clock: string) => tx('game', 'timeAttack.clockAria', { clock }),
    found: (count: number) => tx('game', 'timeAttack.found', { count }),
    nextMedal: (needed: number, tier: 'bronze' | 'silver' | 'gold' | 'platinum') =>
      tx('game', 'timeAttack.nextMedal', {
        needed,
        tier: tx('game', `timeAttack.tier${tier[0].toUpperCase()}${tier.slice(1)}`),
      }),
    get topMedal() {
      return tx('game', 'timeAttack.topMedal');
    },
  },
  soloMedals: {
    get rail() {
      return tx('game', 'soloMedals.rail');
    },
    atFound: (target: number, label: string) =>
      tx('game', 'soloMedals.atFound', { count: target, label }),
    atPoints: (target: number, label: string) =>
      tx('game', 'soloMedals.atPoints', { count: target, label }),
    hidden: (label: string) => tx('game', 'soloMedals.hidden', { label }),
    earned: (label: string) => tx('game', 'soloMedals.earned', { label }),
  },
  race: extendLive(
    liveStrings('game', 'race', [
      'boardTitle',
      'boardAria',
      'you',
      'finished',
      'laneDoneNow',
      'laneDoneWaiting',
      'tieBreak',
    ] as const),
    {
      titles: (count: number) => tx('game', 'race.titles', { count }),
      seeRanking: (hidden: number) => tx('game', 'race.seeRanking', { count: hidden }),
    },
  ),
};

export function playerDisconnectedToast(name: string): string {
  return tx('game', 'toasts.disconnected', { name });
}

export function playerLeftMatchToast(name: string): string {
  return tx('game', 'toasts.left', { name });
}
