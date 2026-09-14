// Runtime validation for mutating Client→Server socket payloads.
// TypeScript types on the wire are not a security boundary — parse at the handler.

import { z } from 'zod';
import { GAME_CONFIG } from './constants';

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

export type RoomIdInputParsed = z.infer<typeof roomIdInputSchema>;
export type AnswerInputParsed = z.infer<typeof answerInputSchema>;
export type UpdateRoomSettingsInputParsed = z.infer<typeof updateRoomSettingsInputSchema>;
export type CreateLobbyInputParsed = z.infer<typeof createLobbyInputSchema>;
export type JoinLobbyInputParsed = z.infer<typeof joinLobbyInputSchema>;
export type LobbyTargetInputParsed = z.infer<typeof lobbyTargetInputSchema>;
export type ChatSendMessageInputParsed = z.infer<typeof chatSendMessageInputSchema>;
