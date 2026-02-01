import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { gameManager } from '../../index'; // Import du GameManager

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const sendMessage = (payload: any) => {
    if (!payload.roomId) {
        logger.warn(`Message sans roomId de ${socket.id}`, 'Chat');
        return;
    }

    // ✅ Récupération des infos du joueur pour l'affichage
    const game = gameManager.getGame(payload.roomId);
    const player = game?.players.get(socket.id);

    const messageData = {
      id: Date.now().toString(), // ID unique pour React keys
      senderId: socket.id,
      username: player?.username || "Inconnu",
      avatar: player?.avatar || "player1",
      content: payload.content,
      timestamp: Date.now(),
      isSystem: false
    };

    logger.info(`Message dans ${payload.roomId} de ${player?.username || socket.id}`, 'Chat');
    
    // Broadcast à la room
    io.to(payload.roomId).emit('chat:message', messageData);
  };

  socket.on('chat:sendMessage', sendMessage);
};