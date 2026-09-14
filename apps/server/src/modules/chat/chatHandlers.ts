import { chatSendMessageInputSchema } from '@aniquizz/shared';
import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { logger } from '../../utils/logger';
import { guard, RATE_LIMITS } from '../../core/guards';
import { parseSocketPayload } from '../../core/parseSocketPayload';

export const registerChatHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  const sendMessage = (payload: { roomId: string; content: string }) => {
    const parsed = parseSocketPayload(socket, chatSendMessageInputSchema, payload);
    if (!parsed) return;

    const userId = socket.data.userId;
    // Only authenticated members of the target room may broadcast to it. This
    // prevents a client from injecting messages into arbitrary rooms it never
    // joined (the roomId is client-supplied).
    if (!userId) return;
    const room = gameManager.getRoom(parsed.roomId);
    const player = room?.players.get(userId);
    if (!room || !player) return;

    // Admin mute: silently drop the message and notify the sender.
    const mutedUntil = socket.data.mutedUntil;
    if (mutedUntil && new Date(mutedUntil).getTime() > Date.now()) {
      socket.emit('error', { message: 'Vous êtes réduit au silence par la modération.' });
      return;
    }

    // Talking counts as activity so a chatty lobby isn't closed as "idle".
    room.touch();

    io.to(parsed.roomId).emit('chat:message', {
      id: Date.now().toString(),
      senderId: userId,
      username: player.username || socket.data.username || 'Inconnu',
      avatar: player.avatar || 'player1',
      content: parsed.content,
      timestamp: Date.now(),
      isSystem: false,
    });

    logger.info(`Chat message in ${parsed.roomId} from ${player.username || userId}`, 'Chat');
  };

  socket.on('chat:sendMessage', guard(socket, 'chat:sendMessage', RATE_LIMITS.chat, sendMessage));
};
