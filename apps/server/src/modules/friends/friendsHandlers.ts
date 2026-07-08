// apps/server/src/modules/friends/friendsHandlers.ts
// Socket wiring for the friends feature. Auth + rate-limit via core guards.
// After every mutation both parties get a fresh `friends:state` snapshot.

import type { TypedServer, TypedSocket } from '../../core/socketTypes';
import type {
  FriendRequestInput,
  FriendRequestActionInput,
  FriendRemoveInput,
  FriendUserIdInput,
  FriendInviteInput,
  FriendPrivacyInput,
} from '@aniquizz/shared';
import type { GameManager } from '../game/gameManager';
import { requireAuth, guard, RATE_LIMITS } from '../../core/guards';
import { logger } from '../../utils/logger';
import { friendsService, FriendServiceError } from './friendsService';
import { isUserOnline, userRoom, presenceResolver } from './friendsPresence';
import { getPublicProfile } from '../profile/profileService';

export const registerFriendsHandlers = (
  io: TypedServer,
  socket: TypedSocket,
  gameManager: GameManager,
) => {
  const presence = presenceResolver(io, gameManager);
  const online = (id: string) => isUserOnline(io, id);

  /** Push a fresh snapshot to a specific user's socket(s). */
  const pushState = async (userId: string) => {
    const state = await friendsService.getState(userId, presence);
    io.to(userRoom(userId)).emit('friends:state', state);
  };

  const fail = (error: unknown, action: string) => {
    if (error instanceof FriendServiceError) {
      socket.emit('friends:error', { message: error.message });
    } else {
      logger.error(`[Friends] ${action} failed`, 'Friends', error);
      socket.emit('friends:error', { message: 'Une erreur est survenue.' });
    }
  };

  const handleList = async () => {
    const userId = socket.data.userId as string;
    try {
      socket.emit('friends:state', await friendsService.getState(userId, presence));
    } catch (e) {
      fail(e, 'list');
    }
  };

  const handleRequest = async (payload: FriendRequestInput) => {
    const userId = socket.data.userId as string;
    try {
      const res = await friendsService.sendRequest(userId, {
        username: payload?.username,
        userId: payload?.userId,
      });
      await Promise.all([pushState(userId), pushState(res.other.id)]);
      if (res.type === 'created' && online(res.other.id)) {
        io.to(userRoom(res.other.id)).emit('friends:request_received', {
          from: friendsService.toSummary(res.requester, presence),
        });
      }
    } catch (e) {
      fail(e, 'request');
    }
  };

  const handleAccept = async (payload: FriendRequestActionInput) => {
    const userId = socket.data.userId as string;
    try {
      const { otherId } = await friendsService.acceptRequest(userId, payload?.requestId ?? '');
      await Promise.all([pushState(userId), pushState(otherId)]);
    } catch (e) {
      fail(e, 'accept');
    }
  };

  const handleReject = async (payload: FriendRequestActionInput) => {
    const userId = socket.data.userId as string;
    try {
      const { otherId } = await friendsService.rejectRequest(userId, payload?.requestId ?? '');
      await Promise.all([pushState(userId), pushState(otherId)]);
    } catch (e) {
      fail(e, 'reject');
    }
  };

  const handleRemove = async (payload: FriendRemoveInput) => {
    const userId = socket.data.userId as string;
    try {
      const { otherId } = await friendsService.removeFriend(userId, payload?.userId ?? '');
      await Promise.all([pushState(userId), pushState(otherId)]);
    } catch (e) {
      fail(e, 'remove');
    }
  };

  const handleBlock = async (payload: FriendUserIdInput) => {
    const userId = socket.data.userId as string;
    try {
      const { otherId } = await friendsService.blockUser(userId, payload?.userId ?? '');
      await Promise.all([pushState(userId), pushState(otherId)]);
    } catch (e) {
      fail(e, 'block');
    }
  };

  const handleUnblock = async (payload: FriendUserIdInput) => {
    const userId = socket.data.userId as string;
    try {
      const { otherId } = await friendsService.unblockUser(userId, payload?.userId ?? '');
      await Promise.all([pushState(userId), pushState(otherId)]);
    } catch (e) {
      fail(e, 'unblock');
    }
  };

  const handleSetPrivacy = async (payload: FriendPrivacyInput) => {
    const userId = socket.data.userId as string;
    try {
      await friendsService.setPrivacy(userId, payload?.allow !== false);
      await pushState(userId);
    } catch (e) {
      fail(e, 'set_privacy');
    }
  };

  const handleRecent = async () => {
    const userId = socket.data.userId as string;
    try {
      const players = await friendsService.getRecentPlayers(userId);
      socket.emit('friends:recent', { players });
    } catch (e) {
      fail(e, 'recent');
    }
  };

  const handleInvite = async (payload: FriendInviteInput) => {
    const userId = socket.data.userId as string;
    const targetId = payload?.userId ?? '';
    try {
      if (!targetId) throw new FriendServiceError('Ami introuvable.');
      if (targetId.startsWith('bot-')) throw new FriendServiceError('Ami introuvable.');
      const mine = gameManager.getUserPresence(userId);
      if (!mine.roomId) throw new FriendServiceError("Vous n'êtes pas dans un salon.");
      const room = gameManager.getRoom(mine.roomId);
      if (!room) throw new FriendServiceError('Salon introuvable.');
      // Only the host manages the guest list — prevents invite spam and keeps
      // control of who joins with the room owner.
      if (userId !== room.hostId) throw new FriendServiceError("Seul l'hôte peut inviter des joueurs.");
      if (await friendsService.isBlockedEitherWay(userId, targetId)) {
        throw new FriendServiceError('Action impossible.');
      }
      if (!online(targetId)) throw new FriendServiceError("Cet ami n'est pas en ligne.");

      const me = await friendsService.getProfileLite(userId);
      io.to(userRoom(targetId)).emit('friends:invite_received', {
        from: {
          id: userId,
          username: me?.username ?? socket.data.username,
          avatar: me?.avatar ?? 'player1',
        },
        roomId: room.id,
        roomName: room.settings.name,
        isPrivate: room.settings.isPrivate,
      });
      socket.emit('friends:info', { message: 'Invitation envoyée.' });
    } catch (e) {
      fail(e, 'invite');
    }
  };

  const handleGetPublic = async (payload: FriendUserIdInput) => {
    const userId = socket.data.userId as string;
    const targetId = payload?.userId ?? '';
    try {
      if (!targetId) throw new FriendServiceError('Profil introuvable.');
      if (targetId.startsWith('bot-')) throw new FriendServiceError('Profil introuvable.');
      const friends = await friendsService.getPublicFriends(targetId, presence);
      const profile = await getPublicProfile(userId, targetId, presence(targetId), friends);
      socket.emit('profile:public', profile);
    } catch (e) {
      fail(e, 'get_public');
    }
  };

  socket.on('friends:list', requireAuth(socket, handleList));
  socket.on('friends:request', guard(socket, 'friends', RATE_LIMITS.friends, handleRequest));
  socket.on('friends:accept', guard(socket, 'friends', RATE_LIMITS.friends, handleAccept));
  socket.on('friends:reject', guard(socket, 'friends', RATE_LIMITS.friends, handleReject));
  socket.on('friends:remove', guard(socket, 'friends', RATE_LIMITS.friends, handleRemove));
  socket.on('friends:block', guard(socket, 'friends', RATE_LIMITS.friends, handleBlock));
  socket.on('friends:unblock', guard(socket, 'friends', RATE_LIMITS.friends, handleUnblock));
  socket.on('friends:invite', guard(socket, 'friends', RATE_LIMITS.friends, handleInvite));
  socket.on('friends:set_privacy', guard(socket, 'friends', RATE_LIMITS.friends, handleSetPrivacy));
  socket.on('friends:recent', requireAuth(socket, handleRecent));
  socket.on('profile:get_public', guard(socket, 'friends', RATE_LIMITS.friends, handleGetPublic));
};
