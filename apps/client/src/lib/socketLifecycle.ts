import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import type { GameOverPayload, LevelUpPayload, SanctionUpdatePayload } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { shouldReconnectAfterSessionReplaced } from '@/lib/socketReady';
import { xpEarnedForUser } from '@/features/auth/lib/matchXpProfile';

let connectedUserId: string | null | undefined = undefined;

/** Keep the socket auth payload in sync and connect on login / account switch. */
export function syncSocketSession(session: Session | null, username: string): void {
  const token = session?.access_token;
  const userId = session?.user?.id ?? null;

  socket.auth = { username, token };

  if (connectedUserId !== userId) {
    connectedUserId = userId;
    if (socket.connected) socket.disconnect();
    if (userId) socket.connect();
  }
}

export function registerLevelUpHandler(onXp: (payload: LevelUpPayload) => void): () => void {
  const onLevelUp = (payload: LevelUpPayload) => {
    toast.success(`Niveau ${payload.newLevel} atteint !`, {
      description: 'Continue comme ça pour grimper les niveaux.',
    });
    onXp(payload);
  };

  socket.on('level_up', onLevelUp);
  return () => {
    socket.off('level_up', onLevelUp);
  };
}

/**
 * Apply match XP to the Auth profile from `game_over`. Do not SELECT Profile
 * here: persistMatch is still in flight, so a fetch would overwrite with stale XP.
 */
export function registerGameOverXpHandler(
  getUserId: () => string | null | undefined,
  onXpEarned: (earned: number) => void,
): () => void {
  const onGameOver = (payload: GameOverPayload) => {
    const userId = getUserId();
    if (!userId) return;
    const earned = xpEarnedForUser(payload.victoryData.rankings, userId);
    if (earned == null || earned === 0) return;
    onXpEarned(earned);
  };

  socket.on('game_over', onGameOver);
  return () => {
    socket.off('game_over', onGameOver);
  };
}

/** Keep profile sanctions in sync when a mod applies or lifts mute/ban. */
export function registerSanctionHandler(
  onSanctionUpdate: (payload: SanctionUpdatePayload) => void,
): () => void {
  socket.on('profile:sanction_updated', onSanctionUpdate);
  return () => {
    socket.off('profile:sanction_updated', onSanctionUpdate);
  };
}

/**
 * Socket.io does not auto-reconnect after `io server disconnect`.
 * Same-tab ghosts (overlapping handshake) must call connect() again.
 */
export function registerSessionReplacementReconnect(): () => void {
  let lastConnectAt = 0;
  const onConnect = () => {
    lastConnectAt = Date.now();
  };
  const onReplaced = () => {
    const auth = socket.auth as { token?: string } | undefined;
    if (
      !shouldReconnectAfterSessionReplaced({
        connected: socket.connected,
        hasAuthToken: Boolean(auth?.token),
        msSinceLastConnect: Date.now() - lastConnectAt,
        tabFocused: typeof document === 'undefined' ? false : document.hasFocus(),
      })
    ) {
      return;
    }
    queueMicrotask(() => {
      if (!socket.connected) socket.connect();
    });
  };
  socket.on('connect', onConnect);
  socket.on('session_replaced', onReplaced);
  if (socket.connected) lastConnectAt = Date.now();
  return () => {
    socket.off('connect', onConnect);
    socket.off('session_replaced', onReplaced);
  };
}
