import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import type { SanctionUpdatePayload } from '@aniquizz/shared';
import { socket } from '@/lib/socket';

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

export function registerLevelUpHandler(
  session: Session | null,
  onProfileRefresh: () => void,
): () => void {
  const onLevelUp = (payload: { oldLevel: number; newLevel: number; xp: number }) => {
    toast.success(`Niveau ${payload.newLevel} atteint !`, {
      description: 'Continue comme ça pour grimper les niveaux.',
    });
    if (session?.user) onProfileRefresh();
  };

  socket.on('level_up', onLevelUp);
  return () => {
    socket.off('level_up', onLevelUp);
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
