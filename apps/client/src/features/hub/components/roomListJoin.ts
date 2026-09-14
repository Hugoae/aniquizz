import { isRoomListJoinable, type GameStatus } from '@aniquizz/shared';
import { HUB_COPY } from '@/features/hub/copy/hubCopy';

export { isRoomListJoinable };

export function roomJoinButtonLabel(room: {
  status: GameStatus;
  players: number;
  maxPlayers: number;
}): string {
  if (room.players >= room.maxPlayers) return HUB_COPY.room.full;
  if (!isRoomListJoinable(room)) return HUB_COPY.room.inProgress;
  return HUB_COPY.room.join;
}
