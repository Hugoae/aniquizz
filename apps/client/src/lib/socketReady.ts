/** Wait after `connect` so SocketManager can drop the previous (ghost) socket. */
export const SOCKET_READY_SETTLE_MS = 80;

/** Own overlapping handshake — reconnect the singleton after `session_replaced`. */
export const SESSION_REPLACED_GHOST_WINDOW_MS = 2_000;

export type ReadySocket = {
  connected: boolean;
  on(event: 'connect', listener: () => void): void;
  off(event: 'connect', listener: () => void): void;
};

/**
 * Run `emit` only while the socket is still connected after a short settle.
 * Never calls `connect()` — Auth owns the handshake.
 */
export function subscribeWhenSocketReady(
  socket: ReadySocket,
  emit: () => void,
  settleMs = SOCKET_READY_SETTLE_MS,
): () => void {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = () => {
    if (cancelled || !socket.connected) return;
    emit();
  };

  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(run, settleMs);
  };

  socket.on('connect', schedule);
  if (socket.connected) schedule();

  return () => {
    cancelled = true;
    if (timer !== undefined) clearTimeout(timer);
    socket.off('connect', schedule);
  };
}

/**
 * Like `subscribeWhenSocketReady`, but unsubscribes after the first successful emit
 * so a later reconnect does not replay a user mutator (create room, start game).
 */
export function onceWhenSocketReady(
  socket: ReadySocket,
  emit: () => void,
  settleMs = SOCKET_READY_SETTLE_MS,
): () => void {
  const stop = subscribeWhenSocketReady(
    socket,
    () => {
      stop();
      emit();
    },
    settleMs,
  );
  return stop;
}

/** Last-write-wins queue for one-shot hub mutators (double-click / unmount). */
export function createOnceReadyQueue(socket: ReadySocket) {
  let stop: (() => void) | null = null;

  return {
    enqueue(emit: () => void) {
      stop?.();
      stop = onceWhenSocketReady(socket, () => {
        stop = null;
        emit();
      });
    },
    cancel() {
      stop?.();
      stop = null;
    },
  };
}

export function shouldReconnectAfterSessionReplaced(opts: {
  connected: boolean;
  hasAuthToken: boolean;
  msSinceLastConnect: number;
  tabFocused: boolean;
  ghostWindowMs?: number;
}): boolean {
  if (opts.connected || !opts.hasAuthToken) return false;
  if (opts.msSinceLastConnect <= (opts.ghostWindowMs ?? SESSION_REPLACED_GHOST_WINDOW_MS)) {
    return true;
  }
  return opts.tabFocused;
}
