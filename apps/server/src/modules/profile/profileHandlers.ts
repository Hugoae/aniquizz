import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import { logger } from '../../utils/logger';
import { getProfileStats } from './profileService';
import { verifyAnilistUser } from '../anilist/anilistService';
import { verifyMalUser } from '../mal/malService';
import { prisma } from '@aniquizz/database';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';
import type { GameManager } from '../game/gameManager';
import { DeleteAccountError, deleteUserAccount } from './deleteAccount';

export const registerProfileHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  const handleGetStats = async () => {
    try {
      const userId = socket.data.userId as string;
      const stats = await getProfileStats(userId);
      socket.emit('profile:stats', stats);
    } catch {
      socket.emit('profile:error', { message: 'Impossible de charger les statistiques' });
    }
  };

  const handleUpdateProfile = async (payload: {
    username?: string;
    avatarUrl?: string;
    anilistUsername?: string | null;
    malUsername?: string | null;
  }) => {
    const userId = socket.data.userId as string;

    try {
      const updateData: Record<string, unknown> = {};
      if (payload.username) updateData.username = payload.username;
      if (payload.avatarUrl) updateData.avatar = payload.avatarUrl;

      if (payload.anilistUsername !== undefined) {
        const trimmed = typeof payload.anilistUsername === 'string' ? payload.anilistUsername.trim() : null;
        const value = trimmed && trimmed.length > 0 ? trimmed : null;
        if (value) {
          const check = await verifyAnilistUser(value);
          if (check === 'not_found') {
            socket.emit('error', { message: "Compte AniList introuvable. Vérifie l'orthographe de ton pseudo." });
            return;
          }
          updateData.anilistUsername = value;
          updateData.malUsername = null;
        } else {
          updateData.anilistUsername = null;
        }
      }

      if (payload.malUsername !== undefined) {
        const trimmed = typeof payload.malUsername === 'string' ? payload.malUsername.trim() : null;
        const value = trimmed && trimmed.length > 0 ? trimmed : null;
        if (value) {
          const check = await verifyMalUser(value);
          if (check === 'not_found') {
            socket.emit('error', { message: "Compte MyAnimeList introuvable. Vérifie l'orthographe de ton pseudo." });
            return;
          }
          updateData.malUsername = value;
          updateData.anilistUsername = null;
        } else {
          updateData.malUsername = null;
        }
      }

      await prisma.profile.update({
        where: { id: userId },
        data: updateData,
      });

      socket.emit('user_profile', { success: true });
      logger.info(`Profil mis à jour pour ${userId}`, 'Profile');
    } catch (error) {
      logger.error('Erreur update profil', 'Profile', error);
      socket.emit('error', {
        message: payload.username
          ? 'Ce pseudo est peut-être déjà pris.'
          : 'Impossible de mettre à jour le profil.',
      });
    }
  };

  const handleDeleteAccount = async (payload: { confirmUsername?: string }) => {
    const userId = socket.data.userId as string;

    try {
      await deleteUserAccount({
        userId,
        confirmUsername: payload?.confirmUsername ?? '',
        io,
        gameManager,
      });
    } catch (error) {
      if (error instanceof DeleteAccountError) {
        socket.emit('profile:error', { message: error.message });
        return;
      }
      logger.error('Erreur suppression compte', 'Profile', error);
      socket.emit('profile:error', { message: 'Impossible de supprimer le compte. Réessaie plus tard.' });
    }
  };

  socket.on('profile:get_stats', requireAuth(socket, handleGetStats));
  socket.on('update_profile_data', requireAuth(socket, handleUpdateProfile));
  socket.on(
    'profile:delete_account',
    guard(socket, 'profile:delete_account', RATE_LIMITS.deleteAccount, handleDeleteAccount),
  );
};
