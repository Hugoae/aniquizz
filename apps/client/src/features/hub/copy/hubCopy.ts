import { extendLive, liveStrings, tx } from '@/lib/i18n/text';

const top = [
  'backHome',
  'back',
  'modeTitleLead',
  'modeTitleAccent',
  'modeSubtitle',
  'joinTitleLead',
  'joinTitleAccent',
  'createRoom',
  'join',
  'codePlaceholder',
  'reset',
  'configNext',
  'copied',
  'configSection',
  'guest',
  'player',
  'defaultRoomName',
] as const;

export const HUB_COPY = extendLive(liveStrings('hub', '', top), {
  modes: {
    solo: liveStrings('hub', 'modes.solo', ['title', 'description'] as const),
    multiplayer: liveStrings('hub', 'modes.multiplayer', ['title', 'description'] as const),
    competitive: liveStrings('hub', 'modes.competitive', [
      'title',
      'description',
      'badge',
      'note',
    ] as const),
  },
  passwordDialog: liveStrings('hub', 'passwordDialog', [
    'title',
    'description',
    'label',
    'cancel',
    'submit',
  ] as const),
  seo: liveStrings('hub', 'seo', ['playDescription'] as const),
  toasts: liveStrings('hub', 'toasts', [
    'settingsUpdated',
    'youAreHost',
    'missingRoom',
    'genericError',
    'roomClosed',
    'poolNowSufficient',
  ] as const),
  room: liveStrings('hub', 'room', ['full', 'inProgress', 'join'] as const),
  configTitle: {
    solo: {
      get lead() {
        return tx('hub', 'configTitle.soloLead');
      },
      get accent() {
        return tx('hub', 'configTitle.soloAccent');
      },
    },
    editSolo: {
      get lead() {
        return tx('hub', 'configTitle.editSoloLead');
      },
      get accent() {
        return tx('hub', 'configTitle.editSoloAccent');
      },
    },
    editRoom: {
      get lead() {
        return tx('hub', 'configTitle.editRoomLead');
      },
      get accent() {
        return tx('hub', 'configTitle.editRoomAccent');
      },
    },
    create: {
      get lead() {
        return tx('hub', 'configTitle.createLead');
      },
      get accent() {
        return tx('hub', 'configTitle.createAccent');
      },
    },
  },
});

export function soloRoomName(pseudo: string): string {
  return tx('hub', 'soloRoomName', { name: pseudo });
}

export function multiplayerTeaser(count: number): string {
  if (count <= 0) return tx('hub', 'teaserNone');
  return tx('hub', 'teaser', { count });
}

export function videoModeLabel(mode: 'hidden' | 'blurred' | 'peek'): string {
  return tx('hub', `videoMode.${mode}`);
}

export function videoModeHint(mode: 'hidden' | 'blurred' | 'peek'): string {
  return tx('hub', `videoMode.${mode}Hint`);
}

export function songStartLabel(mode: 'random' | 'beginning'): string {
  return tx('hub', `songStart.${mode}`);
}

export function songStartHint(mode: 'random' | 'beginning'): string {
  return tx('hub', `songStart.${mode}Hint`);
}

export function gameTypeLabel(type: 'standard' | 'timeAttack' | 'evolving'): string {
  return tx('hub', `gameType.${type}`);
}

export function precisionChipLabel(value: unknown): string {
  const key =
    value === 'anime' || value === 'exact' ? 'anime' : value === 'artist' ? 'artist' : 'franchise';
  return tx('hub', `precisionChip.${key}`);
}

export function sourceLabel(source: 'random' | 'mix' | 'watched' | 'playlist'): string {
  return tx('hub', `source.${source}`);
}
