import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import { logger } from '../../utils/logger';
import { getProfileStats } from './profileService';
import { prisma } from '@aniquizz/database';
import {
  deleteAccountInputSchema,
  isTrustedSupabaseAvatarUrl,
  mergePlayerPrefsPatch,
  normalizeAccountPrivacy,
  normalizePlayerPrefs,
  updatePrefsInputSchema,
  updatePrivacyInputSchema,
  updateProfileDataInputSchema,
} from '@aniquizz/shared';
import { env } from '../../config/env';
import { guard, requireAuth, RATE_LIMITS } from '../../core/guards';
import { parseSocketPayload } from '../../core/parseSocketPayload';
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

  const handleUpdateProfile = async (payload: unknown) => {
    const parsed = parseSocketPayload(socket, updateProfileDataInputSchema, payload);
    if (!parsed) return;
    const userId = socket.data.userId as string;

    try {
      const updateData: Record<string, unknown> = {};
      if (parsed.username !== undefined) updateData.username = parsed.username;
      if (parsed.avatarUrl) {
        if (!isTrustedSupabaseAvatarUrl(parsed.avatarUrl, env.SUPABASE_URL, userId)) {
          socket.emit('error', { message: "URL d'avatar invalide." });
          return;
        }
        updateData.avatar = parsed.avatarUrl;
      }

      await prisma.profile.update({
        where: { id: userId },
        data: updateData,
      });

      const nextUsername = typeof updateData.username === 'string' ? updateData.username : null;
      if (nextUsername) socket.data.username = nextUsername;

      socket.emit('user_profile', { success: true });
      logger.info(`Profil mis à jour pour ${userId}`, 'Profile');
    } catch (error) {
      logger.error('Erreur update profil', 'Profile', error);
      socket.emit('error', {
        message: parsed.username
          ? 'Ce pseudo est peut-être déjà pris.'
          : 'Impossible de mettre à jour le profil.',
      });
    }
  };

  const handleDeleteAccount = async (payload: unknown) => {
    const parsed = parseSocketPayload(socket, deleteAccountInputSchema, payload);
    if (!parsed) return;
    const userId = socket.data.userId as string;

    try {
      await deleteUserAccount({
        userId,
        confirmUsername: parsed.confirmUsername,
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
        message: 'Impossible de supprimer le compte. Réessayez plus tard.',
      });
    }
  };

  const handleUpdatePrefs = async (payload: unknown) => {
    const parsed = parseSocketPayload(socket, updatePrefsInputSchema, payload);
    if (!parsed) return;
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

      const next = mergePlayerPrefsPatch(normalizePlayerPrefs(current), parsed);

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

  const handleUpdatePrivacy = async (payload: unknown) => {
    const parsed = parseSocketPayload(socket, updatePrivacyInputSchema, payload);
    if (!parsed) return;
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
        ...parsed,
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
  socket.on(
    'update_profile_data',
    guard(socket, 'update_profile_data', RATE_LIMITS.updateProfile, handleUpdateProfile),
  );
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
