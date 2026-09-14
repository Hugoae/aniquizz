import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  SESSION_REPLACED_GHOST_WINDOW_MS,
  SOCKET_READY_SETTLE_MS,
  createOnceReadyQueue,
  onceWhenSocketReady,
  shouldReconnectAfterSessionReplaced,
  subscribeWhenSocketReady,
} from './socketReady';

function mockSocket(connected = false) {
  const listeners = new Set<() => void>();
  return {
    connected,
    on(_event: 'connect', listener: () => void) {
      listeners.add(listener);
    },
    off(_event: 'connect', listener: () => void) {
      listeners.delete(listener);
    },
    emitConnect() {
      this.connected = true;
      for (const listener of listeners) listener();
    },
    drop() {
      this.connected = false;
    },
  };
}

describe('subscribeWhenSocketReady', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not emit immediately when already connected', () => {
    vi.useFakeTimers();
    const socket = mockSocket(true);
    const emit = vi.fn();
    subscribeWhenSocketReady(socket, emit);
    expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS - 1);
    expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('skips emit if the socket drops during settle', () => {
    vi.useFakeTimers();
    const socket = mockSocket(true);
    const emit = vi.fn();
    subscribeWhenSocketReady(socket, emit);
    socket.drop();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits after a later connect settles', () => {
    vi.useFakeTimers();
    const socket = mockSocket(false);
    const emit = vi.fn();
    subscribeWhenSocketReady(socket, emit);
    socket.emitConnect();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('does not emit after unsubscribe', () => {
    vi.useFakeTimers();
    const socket = mockSocket(true);
    const emit = vi.fn();
    const stop = subscribeWhenSocketReady(socket, emit);
    stop();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('onceWhenSocketReady', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('unsubscribes after the first successful emit', () => {
    vi.useFakeTimers();
    const socket = mockSocket(true);
    const emit = vi.fn();
    onceWhenSocketReady(socket, emit);
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).toHaveBeenCalledTimes(1);
    socket.drop();
    socket.emitConnect();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('retries on a later connect if the first settle dropped', () => {
    vi.useFakeTimers();
    const socket = mockSocket(true);
    const emit = vi.fn();
    onceWhenSocketReady(socket, emit);
    socket.drop();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).not.toHaveBeenCalled();
    socket.emitConnect();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).toHaveBeenCalledTimes(1);
  });
});

describe('createOnceReadyQueue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('cancels the previous queued emit', () => {
    vi.useFakeTimers();
    const socket = mockSocket(true);
    const queue = createOnceReadyQueue(socket);
    const first = vi.fn();
    const second = vi.fn();
    queue.enqueue(first);
    queue.enqueue(second);
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not emit after cancel', () => {
    vi.useFakeTimers();
    const socket = mockSocket(true);
    const queue = createOnceReadyQueue(socket);
    const emit = vi.fn();
    queue.enqueue(emit);
    queue.cancel();
    vi.advanceTimersByTime(SOCKET_READY_SETTLE_MS);
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('shouldReconnectAfterSessionReplaced', () => {
  it('reconnects a ghost dropped right after our own connect', () => {
    expect(
      shouldReconnectAfterSessionReplaced({
        connected: false,
        hasAuthToken: true,
        msSinceLastConnect: 20,
        tabFocused: false,
      }),
    ).toBe(true);
  });

  it('leaves an unfocused tab dead after another device takes the session', () => {
    expect(
      shouldReconnectAfterSessionReplaced({
        connected: false,
        hasAuthToken: true,
        msSinceLastConnect: SESSION_REPLACED_GHOST_WINDOW_MS + 1,
        tabFocused: false,
      }),
    ).toBe(false);
  });

  it('lets a focused tab steal the session back', () => {
    expect(
      shouldReconnectAfterSessionReplaced({
        connected: false,
        hasAuthToken: true,
        msSinceLastConnect: SESSION_REPLACED_GHOST_WINDOW_MS + 1,
        tabFocused: true,
      }),
    ).toBe(true);
  });

  it('does nothing when already connected or logged out', () => {
    expect(
      shouldReconnectAfterSessionReplaced({
        connected: true,
        hasAuthToken: true,
        msSinceLastConnect: 10,
        tabFocused: true,
      }),
    ).toBe(false);
    expect(
      shouldReconnectAfterSessionReplaced({
        connected: false,
        hasAuthToken: false,
        msSinceLastConnect: 10,
        tabFocused: true,
      }),
    ).toBe(false);
  });
});
