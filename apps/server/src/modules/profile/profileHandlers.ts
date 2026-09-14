import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import { logger } from '../../utils/logger';
import { getProfileStats } from './profileService';
import { prisma } from '@aniquizz/database';
import {
  isTrustedSupabaseAvatarUrl,
  mergePlayerPrefsPatch,
  normalizeAccountPrivacy,
  normalizePlayerPrefs,
  type AccountPrivacyInput,
  type PlayerPrefsInput,
} from '@aniquizz/shared';
import { env } from '../../config/env';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';
import type { GameManager } from '../game/gameManager';
import { DeleteAccountError, deleteUserAccount } from './deleteAccount';
import { schedulePresenceBroadcast } from '../friends/friendsPresence';

const PLAYER_PREFS_SELECT = {
  audioVolume: true,
  audioMuted: true,
  motionMode: true,
  autofocusAnswer: true,
  submitOnEnter: true,
  soloAutoReveal: true,
  showShortcutReminder: true,
  friendRequestVisual: true,
  friendRequestSound: true,
  lobbyInviteVisual: true,
  lobbyInviteSound: true,
} as const;

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
    showFavoriteSongs?: boolean;
  }) => {
    const userId = socket.data.userId as string;

    try {
      const updateData: Record<string, unknown> = {};
      if (payload.username) updateData.username = payload.username;
      if (payload.avatarUrl) {
        if (!isTrustedSupabaseAvatarUrl(payload.avatarUrl, env.SUPABASE_URL, userId)) {
          socket.emit('error', { message: "URL d'avatar invalide." });
          return;
        }
        updateData.avatar = payload.avatarUrl;
      }

      if (payload.showFavoriteSongs !== undefined) {
        updateData.showFavoriteSongs = Boolean(payload.showFavoriteSongs);
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
      socket.emit('profile:error', {
        message: 'Impossible de supprimer le compte. Réessaie plus tard.',
      });
    }
  };

  const handleUpdatePrefs = async (payload: PlayerPrefsInput) => {
    const userId = socket.data.userId as string;

    try {
      const current = await prisma.profile.findUnique({
        where: { id: userId },
        select: PLAYER_PREFS_SELECT,
      });
      if (!current) {
        socket.emit('error', { message: 'Impossible de mettre à jour les préférences.' });
        return;
      }

      const next = mergePlayerPrefsPatch(normalizePlayerPrefs(current), payload);

      await prisma.profile.update({
        where: { id: userId },
        data: next,
      });

      socket.emit('profile:prefs', next);
    } catch (error) {
      logger.error('Failed to update player prefs', 'Profile', error);
      socket.emit('error', { message: 'Impossible de mettre à jour les préférences.' });
    }
  };

  const handleUpdatePrivacy = async (payload: AccountPrivacyInput) => {
    const userId = socket.data.userId as string;
    try {
      const current = await prisma.profile.findUnique({
        where: { id: userId },
        select: {
          onlineStatusAudience: true,
          matchHistoryAudience: true,
          lobbyInviteAudience: true,
          showFavoriteSongs: true,
          allowFriendRequests: true,
        },
      });
      if (!current) {
        socket.emit('error', { message: 'Impossible de mettre à jour la confidentialité.' });
        return;
      }
      const next = normalizeAccountPrivacy({
        ...current,
        ...(payload && typeof payload === 'object' ? payload : {}),
      });
      await prisma.profile.update({
        where: { id: userId },
        data: next,
      });
      socket.emit('profile:privacy', next);
      schedulePresenceBroadcast(io, gameManager, userId, { immediate: true });
    } catch (error) {
      logger.error('Failed to update privacy', 'Profile', error);
      socket.emit('error', { message: 'Impossible de mettre à jour la confidentialité.' });
    }
  };

  socket.on('profile:get_stats', requireAuth(socket, handleGetStats));
  socket.on('update_profile_data', requireAuth(socket, handleUpdateProfile));
  socket.on(
    'profile:update_prefs',
    guard(socket, 'profile:update_prefs', RATE_LIMITS.updatePrefs, handleUpdatePrefs),
  );
  socket.on(
    'profile:update_privacy',
    guard(socket, 'profile:update_privacy', RATE_LIMITS.updatePrivacy, handleUpdatePrivacy),
  );
  socket.on(
    'profile:delete_account',
    guard(socket, 'profile:delete_account', RATE_LIMITS.deleteAccount, handleDeleteAccount),
  );
};
