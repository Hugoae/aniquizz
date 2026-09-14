import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from './constants';
import {
  answerInputSchema,
  roomIdInputSchema,
  updateRoomSettingsInputSchema,
} from './socketPayloads';

describe('roomIdInputSchema', () => {
  it('accepts a live lobby code', () => {
    expect(roomIdInputSchema.parse({ roomId: 'A3K9ZQ' })).toEqual({ roomId: 'A3K9ZQ' });
  });

  it('rejects a missing or empty room id', () => {
    expect(roomIdInputSchema.safeParse({}).success).toBe(false);
    expect(roomIdInputSchema.safeParse({ roomId: '' }).success).toBe(false);
    expect(roomIdInputSchema.safeParse({ roomId: '   ' }).success).toBe(false);
  });

  it('rejects oversized or non-alphanumeric ids', () => {
    expect(roomIdInputSchema.safeParse({ roomId: 'x'.repeat(17) }).success).toBe(false);
    expect(roomIdInputSchema.safeParse({ roomId: 'AB-12' }).success).toBe(false);
  });
});

describe('answerInputSchema', () => {
  it('accepts a typing answer and strips unknown keys', () => {
    expect(
      answerInputSchema.parse({
        roomId: 'A3K9ZQ',
        answer: 'Naruto',
        answerType: 'typing',
        extra: true,
      }),
    ).toEqual({
      roomId: 'A3K9ZQ',
      answer: 'Naruto',
      answerType: 'typing',
    });
  });

  it('accepts optional solo reveal and the three answer types', () => {
    for (const answerType of ['typing', 'qcm', 'duo'] as const) {
      expect(
        answerInputSchema.parse({
          roomId: 'A3K9ZQ',
          answer: 'One Piece',
          answerType,
          revealAfterAnswer: true,
        }).answerType,
      ).toBe(answerType);
    }
  });

  it('rejects a claimed mix type, a missing answer, and oversized text', () => {
    expect(
      answerInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        answer: 'Naruto',
        answerType: 'mix',
      }).success,
    ).toBe(false);
    expect(
      answerInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        answerType: 'typing',
      }).success,
    ).toBe(false);
    expect(
      answerInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        answer: 'x'.repeat(GAME_CONFIG.LIMITS.MAX_ANSWER_LENGTH + 1),
        answerType: 'typing',
      }).success,
    ).toBe(false);
  });
});

describe('updateRoomSettingsInputSchema', () => {
  it('requires a room id and a settings object', () => {
    expect(
      updateRoomSettingsInputSchema.parse({
        roomId: 'A3K9ZQ',
        settings: { soundCount: 15 },
      }),
    ).toEqual({
      roomId: 'A3K9ZQ',
      settings: { soundCount: 15 },
    });
  });

  it('rejects a non-object settings patch', () => {
    expect(
      updateRoomSettingsInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        settings: null,
      }).success,
    ).toBe(false);
    expect(
      updateRoomSettingsInputSchema.safeParse({
        roomId: 'A3K9ZQ',
        settings: [],
      }).success,
    ).toBe(false);
    expect(updateRoomSettingsInputSchema.safeParse({ roomId: 'A3K9ZQ' }).success).toBe(false);
  });
});
