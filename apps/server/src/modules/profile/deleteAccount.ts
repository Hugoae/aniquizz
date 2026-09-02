import { prisma, isBotId } from '@aniquizz/database';
import { logger } from '../../utils/logger';
import { supabaseAdmin } from '../../lib/supabase';
import type { TypedServer } from '../../core/socketTypes';
import type { GameManager } from '../game/gameManager';
import { prepareSuggestionsForAccountDeletion } from '../feedback/suggestionService';

export class DeleteAccountError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_CONFIRMATION' | 'NOT_FOUND' | 'BOT' | 'FAILED',
  ) {
    super(message);
    this.name = 'DeleteAccountError';
  }
}

const CUSTOM_AVATAR_PATH = (userId: string) => `${userId}/avatar.jpg`;

const isCustomUploadedAvatar = (avatar: string, userId: string): boolean =>
  avatar.startsWith('http') && avatar.includes(CUSTOM_AVATAR_PATH(userId));

const removeCustomAvatar = async (userId: string, avatar: string): Promise<void> => {
  if (!isCustomUploadedAvatar(avatar, userId)) return;
  const { error } = await supabaseAdmin.storage.from('avatars').remove([CUSTOM_AVATAR_PATH(userId)]);
  if (error) {
    logger.warn(`[Profile] Avatar storage cleanup failed for ${userId}: ${error.message}`, 'Profile');
  }
};

const disconnectAllUserSockets = (io: TypedServer, userId: string, reason: string): void => {
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.userId !== userId) continue;
    socket.emit('profile:account_deleted');
    socket.emit('force_logout', { reason });
    socket.disconnect(true);
  }
};

/**
 * Permanently deletes the authenticated user's account:
 * eject from live rooms → Prisma cascade → avatar storage → Supabase Auth.
 */
export const deleteUserAccount = async (opts: {
  userId: string;
  confirmUsername: string;
  io: TypedServer;
  gameManager: GameManager;
}): Promise<void> => {
  const { userId, confirmUsername, io, gameManager } = opts;

  if (isBotId(userId)) {
    throw new DeleteAccountError('Ce compte ne peut pas être supprimé.', 'BOT');
  }

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { username: true, avatar: true },
  });

  if (!profile) {
    throw new DeleteAccountError('Compte introuvable.', 'NOT_FOUND');
  }

  if (confirmUsername.trim() !== profile.username) {
    throw new DeleteAccountError('Le pseudo de confirmation ne correspond pas.', 'INVALID_CONFIRMATION');
  }

  gameManager.ejectUserFromAllRooms(userId, 'Compte supprimé.');

  await prepareSuggestionsForAccountDeletion(userId);
  await prisma.profile.delete({ where: { id: userId } });

  await removeCustomAvatar(userId, profile.avatar);

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) {
    logger.error(`[Profile] Supabase Auth delete failed for ${userId}: ${authError.message}`, 'Profile');
    throw new DeleteAccountError(
      'Le profil a été effacé mais la suppression Auth a échoué. Contacte le support.',
      'FAILED',
    );
  }

  disconnectAllUserSockets(
    io,
    userId,
    'Votre compte a été supprimé. À bientôt sur AniQuizz !',
  );

  logger.info(`[Profile] Account deleted for ${userId} (${profile.username}).`, 'Profile');
};
