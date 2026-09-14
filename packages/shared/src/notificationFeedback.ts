import type { PlayerPrefs } from './playerPrefs';

export type InternalNotificationKind = 'friend_request' | 'lobby_invite';

export interface NotificationFeedbackDecision {
  toast: boolean;
  sound: boolean;
}

type NotificationPrefs = Pick<
  PlayerPrefs,
  | 'friendRequestVisual'
  | 'friendRequestSound'
  | 'lobbyInviteVisual'
  | 'lobbyInviteSound'
  | 'audioMuted'
  | 'audioVolume'
>;

/** Visual = toast only. Sound is also gated by the global mute / volume kill-switch. */
export function resolveNotificationFeedback(
  kind: InternalNotificationKind,
  prefs: NotificationPrefs,
): NotificationFeedbackDecision {
  const visual =
    kind === 'friend_request' ? prefs.friendRequestVisual : prefs.lobbyInviteVisual;
  const soundPref =
    kind === 'friend_request' ? prefs.friendRequestSound : prefs.lobbyInviteSound;
  const masterOn = !prefs.audioMuted && prefs.audioVolume > 0;
  return {
    toast: visual,
    sound: soundPref && masterOn,
  };
}
