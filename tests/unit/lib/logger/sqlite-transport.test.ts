import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SQLite Transport', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('persists logs when log saving is enabled', async () => {
    const mockRun = vi.fn();
    const mockValues = vi.fn(() => ({ run: mockRun }));
    const mockInsert = vi.fn(() => ({ values: mockValues }));

    vi.doMock('@/lib/db', () => ({
      db: {
        insert: mockInsert,
      },
    }));

    vi.doMock('@/lib/db/schema', () => ({
      logs: 'mock-logs-table',
    }));

    vi.doMock('@/lib/utils/id', () => ({
      generateLogId: vi.fn(() => 'log_test123'),
    }));

    vi.doMock('@/lib/logger/settings', () => ({
      isLogSavingEnabledSync: vi.fn(() => true),
    }));

    const { SQLiteTransport } = await import('@/lib/logger/transports/sqlite');
    const transport = new SQLiteTransport();

    await new Promise<void>((resolve) => {
      transport.log(
        { level: 'info', message: 'Test message', source: 'test', context: { key: 'value' } },
        () => resolve()
      );
    });

    expect(mockInsert).toHaveBeenCalled();
  });

  it('skips persistence when log saving is disabled', async () => {
    const mockInsert = vi.fn();

    vi.doMock('@/lib/db', () => ({
      db: {
        insert: mockInsert,
      },
    }));

    vi.doMock('@/lib/db/schema', () => ({
      logs: 'mock-logs-table',
    }));

    vi.doMock('@/lib/utils/id', () => ({
      generateLogId: vi.fn(() => 'log_test123'),
    }));

    vi.doMock('@/lib/logger/settings', () => ({
      isLogSavingEnabledSync: vi.fn(() => false),
    }));

    const { SQLiteTransport } = await import('@/lib/logger/transports/sqlite');
    const transport = new SQLiteTransport();

    await new Promise<void>((resolve) => {
      transport.log(
        { level: 'info', message: 'Test message' },
        () => resolve()
      );
    });

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('handles database errors gracefully', async () => {
    const mockInsert = vi.fn(() => ({
      values: vi.fn(() => ({
        run: vi.fn(() => {
          throw new Error('Database error');
        }),
      })),
    }));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.doMock('@/lib/db', () => ({
      db: {
        insert: mockInsert,
      },
    }));

    vi.doMock('@/lib/db/schema', () => ({
      logs: 'mock-logs-table',
    }));

    vi.doMock('@/lib/utils/id', () => ({
      generateLogId: vi.fn(() => 'log_test123'),
    }));

    vi.doMock('@/lib/logger/settings', () => ({
      isLogSavingEnabledSync: vi.fn(() => true),
    }));

    const { SQLiteTransport } = await import('@/lib/logger/transports/sqlite');
    const transport = new SQLiteTransport();

    // Should not throw
    await new Promise<void>((resolve) => {
      transport.log(
        { level: 'info', message: 'Test message' },
        () => resolve()
      );
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to persist log:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it('uses default source when not provided', async () => {
    const mockRun = vi.fn();
    const mockValues = vi.fn(() => ({ run: mockRun }));
    const mockInsert = vi.fn(() => ({ values: mockValues }));

    vi.doMock('@/lib/db', () => ({
      db: {
        insert: mockInsert,
      },
    }));

    vi.doMock('@/lib/db/schema', () => ({
      logs: 'mock-logs-table',
    }));

    vi.doMock('@/lib/utils/id', () => ({
      generateLogId: vi.fn(() => 'log_test123'),
    }));

    vi.doMock('@/lib/logger/settings', () => ({
      isLogSavingEnabledSync: vi.fn(() => true),
    }));

    const { SQLiteTransport } = await import('@/lib/logger/transports/sqlite');
    const transport = new SQLiteTransport();

    await new Promise<void>((resolve) => {
      transport.log(
        { level: 'info', message: 'Test message' },
        () => resolve()
      );
    });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'app',
      })
    );
  });
});
