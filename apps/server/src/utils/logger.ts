import pino, { type Logger as PinoLogger } from 'pino';
import { env } from '../config/env';

export type LogBindings = {
  context?: string;
  userId?: string;
  roomId?: string;
  matchId?: string;
  socketId?: string;
};

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isProduction = env.NODE_ENV === 'production';

const basePino = pino({
  level: env.LOG_LEVEL,
  base: { service: 'aniquizz-server' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,service',
          },
        },
      }),
});

type MetaInput = unknown;

const normalizeMeta = (meta?: MetaInput): Record<string, unknown> => {
  if (meta === undefined) return {};

  if (meta instanceof Error) {
    return { err: meta };
  }

  if (typeof meta === 'object' && meta !== null) {
    return meta as Record<string, unknown>;
  }

  return { meta };
};

export interface AppLogger {
  error: (message: string, context?: string, meta?: MetaInput) => void;
  warn: (message: string, context?: string, meta?: MetaInput) => void;
  info: (message: string, context?: string, meta?: MetaInput) => void;
  http: (message: string, context?: string, meta?: MetaInput) => void;
  debug: (message: string, context?: string, meta?: MetaInput) => void;
  child: (bindings: LogBindings) => AppLogger;
}

const wrapPino = (instance: PinoLogger): AppLogger => {
  const write =
    (level: LogLevel) =>
    (message: string, context?: string, meta?: MetaInput) => {
      const fields: Record<string, unknown> = {
        ...normalizeMeta(meta),
      };
      if (context) fields.context = context;
      instance[level](fields, message);
    };

  return {
    error: write('error'),
    warn: write('warn'),
    info: write('info'),
    http: write('info'),
    debug: write('debug'),
    child: (bindings: LogBindings) => wrapPino(instance.child(bindings)),
  };
};

/** Root structured logger. Use `.child()` for correlated lobby/match/player context. */
export const logger: AppLogger = wrapPino(basePino);
