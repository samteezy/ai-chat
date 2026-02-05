import winston from 'winston';
import { LOG_LEVEL, consoleLogFormat } from './config';
import { SQLiteTransport } from './transports/sqlite';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

// Create base Winston logger with Console and SQLite transports
const baseLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      format: consoleLogFormat,
    }),
    new SQLiteTransport({
      level: LOG_LEVEL,
    }),
  ],
});

export function createLogger(source: string, requestId?: string): Logger {
  // Create a child logger with source and requestId metadata
  const childLogger = baseLogger.child({ source, requestId });

  return {
    debug: (message: string, context?: LogContext) => {
      childLogger.debug(message, { context });
    },
    info: (message: string, context?: LogContext) => {
      childLogger.info(message, { context });
    },
    warn: (message: string, context?: LogContext) => {
      childLogger.warn(message, { context });
    },
    error: (message: string, context?: LogContext) => {
      childLogger.error(message, { context });
    },
  };
}

// Convenience export for quick logging without creating a logger instance
export const logger = createLogger('app');
