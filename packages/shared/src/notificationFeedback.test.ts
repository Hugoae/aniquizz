import { describe, expect, it } from 'vitest';
import { PLAYER_PREFS_DEFAULTS, type PlayerPrefs } from './playerPrefs';
import { resolveNotificationFeedback } from './notificationFeedback';

const base = { ...PLAYER_PREFS_DEFAULTS };

function prefs(patch: Partial<PlayerPrefs>): PlayerPrefs {
  return { ...base, ...patch };
}

describe('resolveNotificationFeedback', () => {
  const kinds = ['friend_request', 'lobby_invite'] as const;

  it('covers the four independent toggles without dropping badges (toast-only visual)', () => {
    for (const kind of kinds) {
      const visualKey = kind === 'friend_request' ? 'friendRequestVisual' : 'lobbyInviteVisual';
      const soundKey = kind === 'friend_request' ? 'friendRequestSound' : 'lobbyInviteSound';
      for (const visual of [true, false]) {
        for (const sound of [true, false]) {
          const decided = resolveNotificationFeedback(
            kind,
            prefs({ [visualKey]: visual, [soundKey]: sound }),
          );
          expect(decided.toast).toBe(visual);
          expect(decided.sound).toBe(sound);
        }
      }
    }
  });

  it('silences sound when globally muted or volume is 0', () => {
    expect(
      resolveNotificationFeedback(
        'friend_request',
        prefs({ friendRequestSound: true, audioMuted: true, audioVolume: 40 }),
      ).sound,
    ).toBe(false);
    expect(
      resolveNotificationFeedback(
        'lobby_invite',
        prefs({ lobbyInviteSound: true, audioMuted: false, audioVolume: 0 }),
      ).sound,
    ).toBe(false);
  });

  it('defaults keep current toast behaviour and sounds off', () => {
    expect(resolveNotificationFeedback('friend_request', base)).toEqual({
      toast: true,
      sound: false,
    });
    expect(resolveNotificationFeedback('lobby_invite', base)).toEqual({
      toast: true,
      sound: false,
    });
  });
});
