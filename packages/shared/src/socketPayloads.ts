// Runtime validation for mutating Client→Server socket payloads.
// TypeScript types on the wire are not a security boundary — parse at the handler.

import { z } from 'zod';
import { GAME_CONFIG } from './constants';
import { MAX_LIST_REQUEST_ID_LENGTH, MAX_WATCHLIST_USERNAME_INPUT_LENGTH } from './watchedList';

const roomIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(GAME_CONFIG.LIMITS.MAX_ROOM_ID_LENGTH)
  .regex(/^[A-Za-z0-9]+$/);

export const roomIdInputSchema = z
  .object({
    roomId: roomIdSchema,
  })
  .strip();

export const answerInputSchema = z
  .object({
    roomId: roomIdSchema,
    answer: z.string().max(GAME_CONFIG.LIMITS.MAX_ANSWER_LENGTH),
    answerType: z.enum(['typing', 'qcm', 'duo']),
    revealAfterAnswer: z.boolean().optional(),
  })
  .strip();

export const updateRoomSettingsInputSchema = z
  .object({
    roomId: roomIdSchema,
    settings: z.object({}).passthrough(),
  })
  .strip();

const usernameSchema = z.string().trim().max(GAME_CONFIG.LIMITS.MAX_USERNAME_LENGTH);
const profileUsernameSchema = z.string().trim().min(1).max(GAME_CONFIG.LIMITS.MAX_USERNAME_LENGTH);
const avatarSchema = z.string().trim().min(1).max(GAME_CONFIG.LIMITS.MAX_AVATAR_LENGTH);
const roomNameSchema = z.string().max(GAME_CONFIG.LIMITS.MAX_ROOM_NAME_LENGTH);
const roomPasswordSchema = z.string().max(GAME_CONFIG.LIMITS.MAX_ROOM_PASSWORD_LENGTH);
const targetIdSchema = z.string().trim().min(1).max(128);

export const createLobbyInputSchema = z
  .object({
    roomName: roomNameSchema.optional(),
    username: usernameSchema.optional(),
    avatar: avatarSchema.optional(),
    settings: z.object({}).passthrough().optional(),
  })
  .strip();

export const joinLobbyInputSchema = z
  .object({
    roomId: roomIdSchema,
    username: usernameSchema.optional(),
    avatar: avatarSchema.optional(),
    password: roomPasswordSchema.optional(),
    fromInvite: z.boolean().optional(),
  })
  .strip();

export const lobbyTargetInputSchema = z
  .object({
    roomId: roomIdSchema,
    targetId: targetIdSchema,
  })
  .strip();

export const chatSendMessageInputSchema = z
  .object({
    roomId: roomIdSchema,
    content: z.string().trim().min(1).max(GAME_CONFIG.LIMITS.MAX_CHAT_LENGTH),
  })
  .strip();

export const updateProfileDataInputSchema = z
  .object({
    username: profileUsernameSchema.optional(),
    avatarUrl: avatarSchema.optional(),
  })
  .strip()
  .refine((value) => value.username !== undefined || value.avatarUrl !== undefined);

export const updatePrefsInputSchema = z
  .object({
    audioVolume: z.number().optional(),
    audioMuted: z.boolean().optional(),
    motionMode: z.enum(['auto', 'reduced', 'full']).optional(),
    autofocusAnswer: z.boolean().optional(),
    submitOnEnter: z.boolean().optional(),
    soloAutoReveal: z.boolean().optional(),
    showShortcutReminder: z.boolean().optional(),
    friendRequestVisual: z.boolean().optional(),
    friendRequestSound: z.boolean().optional(),
    lobbyInviteVisual: z.boolean().optional(),
    lobbyInviteSound: z.boolean().optional(),
  })
  .strip();

export const updatePrivacyInputSchema = z
  .object({
    onlineStatusAudience: z.enum(['everyone', 'friends', 'nobody']).optional(),
    matchHistoryAudience: z.enum(['everyone', 'friends', 'nobody']).optional(),
    lobbyInviteAudience: z.enum(['friends', 'nobody']).optional(),
    showFavoriteSongs: z.boolean().optional(),
    allowFriendRequests: z.boolean().optional(),
  })
  .strip();

/** Fail-closed: omitting `allow` must not re-enable friend requests. */
export const friendPrivacyInputSchema = z
  .object({
    allow: z.boolean(),
  })
  .strip();

/** Generous cap so a legacy long username can still confirm deletion. */
export const deleteAccountInputSchema = z
  .object({
    confirmUsername: z.string().trim().min(1).max(64),
  })
  .strip();

const listRequestIdSchema = z.string().trim().min(1).max(MAX_LIST_REQUEST_ID_LENGTH);
const watchedListProviderSchema = z.enum(['anilist', 'mal']);

export const listLinkInputSchema = z
  .object({
    requestId: listRequestIdSchema,
    provider: watchedListProviderSchema,
    username: z.string().trim().min(1).max(MAX_WATCHLIST_USERNAME_INPUT_LENGTH),
  })
  .strip();

export const listProviderOpInputSchema = z
  .object({
    requestId: listRequestIdSchema,
    provider: watchedListProviderSchema,
  })
  .strip();

export type RoomIdInputParsed = z.infer<typeof roomIdInputSchema>;
export type AnswerInputParsed = z.infer<typeof answerInputSchema>;
export type UpdateRoomSettingsInputParsed = z.infer<typeof updateRoomSettingsInputSchema>;
export type CreateLobbyInputParsed = z.infer<typeof createLobbyInputSchema>;
export type JoinLobbyInputParsed = z.infer<typeof joinLobbyInputSchema>;
export type LobbyTargetInputParsed = z.infer<typeof lobbyTargetInputSchema>;
export type ChatSendMessageInputParsed = z.infer<typeof chatSendMessageInputSchema>;
export type UpdateProfileDataInputParsed = z.infer<typeof updateProfileDataInputSchema>;
export type UpdatePrefsInputParsed = z.infer<typeof updatePrefsInputSchema>;
export type UpdatePrivacyInputParsed = z.infer<typeof updatePrivacyInputSchema>;
export type FriendPrivacyInputParsed = z.infer<typeof friendPrivacyInputSchema>;
export type DeleteAccountInputParsed = z.infer<typeof deleteAccountInputSchema>;
export type ListLinkInputParsed = z.infer<typeof listLinkInputSchema>;
export type ListProviderOpInputParsed = z.infer<typeof listProviderOpInputSchema>;
