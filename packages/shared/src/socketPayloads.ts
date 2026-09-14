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

export type RoomIdInputParsed = z.infer<typeof roomIdInputSchema>;
export type AnswerInputParsed = z.infer<typeof answerInputSchema>;
export type UpdateRoomSettingsInputParsed = z.infer<typeof updateRoomSettingsInputSchema>;
