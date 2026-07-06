import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { logger } from '../../utils/logger';
import { guard, RATE_LIMITS } from '../../core/guards';

export const registerChatHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  const sendMessage = (payload: { roomId: string; content: string }) => {
    if (!payload.roomId || !payload.content?.trim()) return;

    const userId = socket.data.userId as string;
    const room = gameManager.getRoom(payload.roomId);
    const player = room?.players.get(userId);

    io.to(payload.roomId).emit('chat:message', {
      id: Date.now().toString(),
      senderId: userId,
      username: player?.username || socket.data.username || 'Inconnu',
      avatar: player?.avatar || 'player1',
      content: payload.content,
      timestamp: Date.now(),
      isSystem: false,
    });

    logger.info(`Chat message in ${payload.roomId} from ${player?.username || userId}`, 'Chat');
  };

  socket.on('chat:sendMessage', guard(socket, 'chat:sendMessage', RATE_LIMITS.chat, sendMessage));
};
