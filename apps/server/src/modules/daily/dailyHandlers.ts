import { dailyAnswerInputSchema, dailyAttemptInputSchema } from '@aniquizz/shared';
import type { TypedSocket } from '../../core/socketTypes';
import { guard, RATE_LIMITS } from '../../core/guards';
import { parseSocketPayload } from '../../core/parseSocketPayload';
import { logger } from '../../utils/logger';
import {
  advanceDailyReveal,
  forfeitDailyRun,
  forfeitDailyRunOnDisconnect,
  lockDailyGuess,
  selectDailyChoice,
  startDailyRun,
} from './dailyEngine';
import { DailyHttpError } from './dailyErrors';

const UNAVAILABLE = 'Impossible de continuer le quiz du jour.';

/**
 * Quiz du jour on the authenticated match socket. The engine pushes
 * `daily:state`; these handlers only forward the player's intent.
 */
export function registerDailyHandlers(socket: TypedSocket): void {
  const uid = (): string => socket.data.userId as string;

  const fail = (error: unknown): void => {
    if (error instanceof DailyHttpError) {
      socket.emit('daily:error', { message: error.message, status: error.status });
      return;
    }
    logger.error('[Daily] Socket action failed', 'Daily', error);
    socket.emit('daily:error', { message: UNAVAILABLE, status: 500 });
  };

  const start = async (): Promise<void> => {
    try {
      await startDailyRun(uid(), socket);
    } catch (error) {
      fail(error);
    }
  };

  const answer = async (payload: { attemptId: string; selected: string | null }): Promise<void> => {
    const parsed = parseSocketPayload(socket, dailyAnswerInputSchema, payload);
    if (!parsed) return;
    if (parsed.selected == null) return;
    try {
      await selectDailyChoice(uid(), parsed.attemptId, parsed.selected, socket);
    } catch (error) {
      fail(error);
    }
  };

  const lock = async (payload: { attemptId: string }): Promise<void> => {
    const parsed = parseSocketPayload(socket, dailyAttemptInputSchema, payload);
    if (!parsed) return;
    try {
      await lockDailyGuess(uid(), parsed.attemptId, socket);
    } catch (error) {
      fail(error);
    }
  };

  const advance = async (payload: { attemptId: string }): Promise<void> => {
    const parsed = parseSocketPayload(socket, dailyAttemptInputSchema, payload);
    if (!parsed) return;
    try {
      await advanceDailyReveal(uid(), parsed.attemptId, socket);
    } catch (error) {
      fail(error);
    }
  };

  const forfeit = async (payload: { attemptId: string }): Promise<void> => {
    const parsed = parseSocketPayload(socket, dailyAttemptInputSchema, payload);
    if (!parsed) return;
    try {
      await forfeitDailyRun(uid(), parsed.attemptId, socket);
    } catch (error) {
      fail(error);
    }
  };

  socket.on('daily:start', guard(socket, 'daily:start', RATE_LIMITS.dailyPlay, start));
  socket.on('daily:answer', guard(socket, 'daily:answer', RATE_LIMITS.dailyPlay, answer));
  socket.on('daily:lock', guard(socket, 'daily:lock', RATE_LIMITS.dailyPlay, lock));
  socket.on('daily:next', guard(socket, 'daily:next', RATE_LIMITS.dailyPlay, advance));
  socket.on('daily:forfeit', guard(socket, 'daily:forfeit', RATE_LIMITS.dailyPlay, forfeit));
  socket.on('disconnect', () => {
    const userId = socket.data.userId;
    if (!userId) return;
    void forfeitDailyRunOnDisconnect(userId, socket.id).catch((error: unknown) => {
      logger.error('[Daily] Disconnect forfeit failed', 'Daily', error);
    });
  });
}
