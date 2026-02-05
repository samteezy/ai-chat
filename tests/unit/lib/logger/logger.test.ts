import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shared mock functions for winston child logger
const mockDebug = vi.fn();
const mockInfo = vi.fn();
const mockWarn = vi.fn();
const mockError = vi.fn();

const mockChildLogger = {
  debug: mockDebug,
  info: mockInfo,
  warn: mockWarn,
  error: mockError,
};

const mockChild = vi.fn(() => mockChildLogger);

vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(() => ({
      child: mockChild,
    })),
    format: {
      printf: vi.fn((fn) => ({ transform: fn })),
      combine: vi.fn((...args) => args),
      timestamp: vi.fn(() => 'timestamp'),
    },
    transports: {
      Console: vi.fn(),
    },
  },
}));

// Mock the SQLite transport
vi.mock('@/lib/logger/transports/sqlite', () => ({
  SQLiteTransport: vi.fn(),
}));

// Mock the config
vi.mock('@/lib/logger/config', () => ({
  LOG_LEVEL: 'debug',
  consoleLogFormat: 'mock-format',
}));

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('creates a logger with the specified source', async () => {
      vi.resetModules();
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('test-source');

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(mockChild).toHaveBeenCalledWith({ source: 'test-source', requestId: undefined });
    });

    it('includes requestId when provided', async () => {
      vi.resetModules();
      const { createLogger } = await import('@/lib/logger');
      createLogger('test', 'req_123');

      expect(mockChild).toHaveBeenCalledWith({ source: 'test', requestId: 'req_123' });
    });
  });

  describe('log methods', () => {
    it('calls winston debug with correct arguments', async () => {
      vi.resetModules();
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('test');

      logger.debug('Debug message');

      expect(mockDebug).toHaveBeenCalledWith('Debug message', { context: undefined });
    });

    it('calls winston info with correct arguments', async () => {
      vi.resetModules();
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('test');

      logger.info('Info message');

      expect(mockInfo).toHaveBeenCalledWith('Info message', { context: undefined });
    });

    it('calls winston warn with correct arguments', async () => {
      vi.resetModules();
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('test');

      logger.warn('Warning message');

      expect(mockWarn).toHaveBeenCalledWith('Warning message', { context: undefined });
    });

    it('calls winston error with correct arguments', async () => {
      vi.resetModules();
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('test');

      logger.error('Error message');

      expect(mockError).toHaveBeenCalledWith('Error message', { context: undefined });
    });

    it('passes context to winston logger', async () => {
      vi.resetModules();
      const { createLogger } = await import('@/lib/logger');
      const logger = createLogger('test');

      logger.info('Test message', { key: 'value' });

      expect(mockInfo).toHaveBeenCalledWith('Test message', { context: { key: 'value' } });
    });
  });

  describe('default logger export', () => {
    it('exports a default logger instance', async () => {
      vi.resetModules();
      const { logger } = await import('@/lib/logger');

      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });
  });
});

describe('Console Format', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('formats log message correctly', async () => {
    // Unmock config and winston for this test
    vi.unmock('@/lib/logger/config');
    vi.doMock('winston', async () => {
      const actual = await vi.importActual('winston');
      return { default: actual };
    });

    const { consoleFormat } = await import('@/lib/logger/config');

    const formatted = consoleFormat.transform({
      level: 'info',
      message: 'Test message',
      timestamp: '2024-01-01T00:00:00.000Z',
      source: 'test-source',
      requestId: 'req_123',
      context: { key: 'value' },
      [Symbol.for('level')]: 'info',
    });

    expect(formatted[Symbol.for('message')]).toBe(
      '[2024-01-01T00:00:00.000Z] [INFO] [test-source] [req_123] Test message {"key":"value"}'
    );
  });

  it('formats log message without optional fields', async () => {
    vi.unmock('@/lib/logger/config');
    vi.doMock('winston', async () => {
      const actual = await vi.importActual('winston');
      return { default: actual };
    });

    const { consoleFormat } = await import('@/lib/logger/config');

    const formatted = consoleFormat.transform({
      level: 'debug',
      message: 'Simple message',
      timestamp: '2024-01-01T00:00:00.000Z',
      [Symbol.for('level')]: 'debug',
    });

    expect(formatted[Symbol.for('message')]).toBe(
      '[2024-01-01T00:00:00.000Z] [DEBUG] [app] Simple message'
    );
  });
});

// SQLite Transport tests are in a separate file (sqlite-transport.test.ts)
// to avoid mock conflicts with the winston module
