import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { resolveNotificationFeedback, type LobbyInvitePayload, type FriendSummary } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { playNotificationChime } from '@/features/notifications/playNotificationChime';

/** Listens for friend-request / lobby-invite events and applies the feedback matrix. */
export function NotificationFeedbackProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const {
    audioMuted,
    audioVolume,
    friendRequestVisual,
    friendRequestSound,
    lobbyInviteVisual,
    lobbyInviteSound,
  } = usePlayerPrefs();

  useEffect(() => {
    const prefs = {
      audioMuted,
      audioVolume,
      friendRequestVisual,
      friendRequestSound,
      lobbyInviteVisual,
      lobbyInviteSound,
    };
    const onRequest = (payload: { from: FriendSummary }) => {
      const feedback = resolveNotificationFeedback('friend_request', prefs);
      if (feedback.toast) {
        toast.info(`${payload.from.username} vous a envoyé une demande d'ami.`);
      }
      if (feedback.sound) playNotificationChime(prefs.audioVolume);
    };
    const onInvite = (p: LobbyInvitePayload) => {
      const feedback = resolveNotificationFeedback('lobby_invite', prefs);
      if (feedback.toast) {
        toast.info(`${p.from.username} vous invite dans « ${p.roomName} »`, {
          action: {
            label: 'Rejoindre',
            onClick: () => navigate('/play', { state: { fromInvite: true, roomId: p.roomId } }),
          },
          duration: 15_000,
        });
      }
      if (feedback.sound) playNotificationChime(prefs.audioVolume);
    };
    socket.on('friends:request_received', onRequest);
    socket.on('friends:invite_received', onInvite);
    return () => {
      socket.off('friends:request_received', onRequest);
      socket.off('friends:invite_received', onInvite);
    };
  }, [
    navigate,
    audioMuted,
    audioVolume,
    friendRequestVisual,
    friendRequestSound,
    lobbyInviteVisual,
    lobbyInviteSound,
  ]);

  return <>{children}</>;
}
