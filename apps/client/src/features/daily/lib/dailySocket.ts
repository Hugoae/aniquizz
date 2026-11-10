import type { DailyPlayState, DailyResultDto, DailySafeRoundDto } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { DailyApiError, invalidateDailyToday } from '@/lib/dailyApi';
import { DAILY_COPY } from '../copy/dailyCopy';

const DAILY_SOCKET_MS = 12_000;
const CONNECT_MS = 4_000;

type Listener = (state: DailyPlayState) => void;

const listeners = new Set<Listener>();
let wired = false;

function wire(): void {
  if (wired) return;
  wired = true;
  socket.on('daily:state', (state) => {
    for (const listener of listeners) listener(state);
  });
}

export function subscribeDailyPlay(listener: Listener): () => void {
  wire();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function waitUntilConnected(): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      socket.off('connect', onConnect);
      reject(new DailyApiError(0, DAILY_COPY.socketDown));
    }, CONNECT_MS);
    const onConnect = () => {
      window.clearTimeout(timer);
      socket.off('connect', onConnect);
      resolve();
    };
    socket.on('connect', onConnect);
    socket.connect();
  });
}

function onceState(): Promise<DailyPlayState> {
  wire();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new DailyApiError(408, DAILY_COPY.socketSlow));
    }, DAILY_SOCKET_MS);
    const onState = (state: DailyPlayState) => {
      cleanup();
      resolve(state);
    };
    const onFail = (payload: { message: string; status?: number }) => {
      cleanup();
      reject(new DailyApiError(payload.status ?? 400, payload.message));
    };
    const onError = (payload: { message?: string }) => {
      cleanup();
      reject(new DailyApiError(400, payload.message || DAILY_COPY.unavailable));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      listeners.delete(onState);
      socket.off('daily:error', onFail);
      socket.off('error', onError);
    };
    listeners.add(onState);
    socket.on('daily:error', onFail);
    socket.on('error', onError);
  });
}

async function emitWhenReady(emit: () => void): Promise<void> {
  await waitUntilConnected();
  emit();
}

export const dailySocket = {
  start: async (): Promise<
    { attempt: DailySafeRoundDto; result: null } | { attempt: null; result: DailyResultDto }
  > => {
    invalidateDailyToday();
    const pending = onceState();
    await emitWhenReady(() => socket.emit('daily:start'));
    const state = await pending;
    if (state.kind === 'result') return { attempt: null, result: state.result };
    return { attempt: state.attempt, result: null };
  },
  /** Store the latest choice. The server reveals when its clock ends, or on lock. */
  answer: (attemptId: string, selected: string): void => {
    socket.emit('daily:answer', { attemptId, selected });
  },
  lock: (attemptId: string): void => {
    socket.emit('daily:lock', { attemptId });
  },
  next: (attemptId: string): void => {
    socket.emit('daily:next', { attemptId });
  },
  forfeit: async (attemptId: string): Promise<{ result: DailyResultDto }> => {
    invalidateDailyToday();
    const pending = onceState();
    await emitWhenReady(() => socket.emit('daily:forfeit', { attemptId }));
    const state = await pending;
    if (state.kind !== 'result') throw new DailyApiError(409, DAILY_COPY.unavailable);
    return { result: state.result };
  },
};
