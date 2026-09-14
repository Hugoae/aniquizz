import { describe, expect, it, vi } from 'vitest';
import { roomIdInputSchema } from '@aniquizz/shared';
import type { TypedSocket } from './socketTypes';
import { INVALID_SOCKET_PAYLOAD_MESSAGE, parseSocketPayload } from './parseSocketPayload';

describe('parseSocketPayload', () => {
  it('returns the parsed value for a valid payload', () => {
    const emit = vi.fn();
    const socket = { emit } as unknown as TypedSocket;
    expect(parseSocketPayload(socket, roomIdInputSchema, { roomId: 'A3K9ZQ' })).toEqual({
      roomId: 'A3K9ZQ',
    });
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits a generic error and returns null when the payload is invalid', () => {
    const emit = vi.fn();
    const socket = { emit } as unknown as TypedSocket;
    expect(parseSocketPayload(socket, roomIdInputSchema, { roomId: '' })).toBeNull();
    expect(emit).toHaveBeenCalledWith('error', { message: INVALID_SOCKET_PAYLOAD_MESSAGE });
  });

  it('treats a missing payload as invalid instead of throwing', () => {
    const emit = vi.fn();
    const socket = { emit } as unknown as TypedSocket;
    expect(parseSocketPayload(socket, roomIdInputSchema, undefined)).toBeNull();
    expect(emit).toHaveBeenCalledWith('error', { message: INVALID_SOCKET_PAYLOAD_MESSAGE });
  });
});
