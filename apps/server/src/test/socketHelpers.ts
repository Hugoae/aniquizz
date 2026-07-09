import { io as ioClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@aniquizz/shared';

export type TestSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export async function connectSocket(
  url: string,
  token: string,
  username: string,
): Promise<TestSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      auth: { token, username },
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Socket connect timeout'));
    }, 15_000);

    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function connectSocketExpectFail(
  url: string,
  token: string,
  username = 'test',
): Promise<Error> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      auth: { token, username },
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Expected connect_error, but connection timed out'));
    }, 15_000);

    socket.on('connect', () => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error('Expected connect_error, but socket connected'));
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(err);
    });
  });
}

export function onceEvent<T>(
  socket: TestSocket,
  event: string,
  timeoutMs = 30_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export function waitForEvent<T>(
  socket: TestSocket,
  event: string,
  predicate: (payload: T) => boolean,
  timeoutMs = 60_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => {
        socket.off(event, handler);
        reject(new Error(`Timeout waiting for "${event}" matching predicate`));
      },
      timeoutMs,
    );

    const handler = (payload: T) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };

    socket.on(event, handler);
  });
}
