import winston from 'winston';

// Log level from environment, defaulting to 'debug' in development, 'info' in production
export const LOG_LEVEL = process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Custom format that matches the existing log output format:
// [timestamp] [LEVEL] [source] [requestId?] message {context?}
export const consoleFormat = winston.format.printf(({ level, message, timestamp, source, requestId, context }) => {
  const reqIdPart = requestId ? ` [${requestId}]` : '';
  const contextPart = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${source || 'app'}]${reqIdPart} ${message}${contextPart}`;
});

// Combined format for console output
export const consoleLogFormat = winston.format.combine(
  winston.format.timestamp(),
  consoleFormat
);
