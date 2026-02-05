import type { Log } from '@/lib/db/schema';

export const mockLogs: Log[] = [
  {
    id: 'log_001',
    level: 'info',
    message: 'Application started',
    context: null,
    source: 'app',
    requestId: null,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'log_002',
    level: 'error',
    message: 'Database connection failed',
    context: { error: 'Connection timeout' },
    source: 'api/chat',
    requestId: 'req_123',
    createdAt: new Date('2024-01-01T10:01:00Z'),
  },
  {
    id: 'log_003',
    level: 'warn',
    message: 'High memory usage detected',
    context: { memoryUsage: '85%' },
    source: 'system',
    requestId: null,
    createdAt: new Date('2024-01-01T10:02:00Z'),
  },
  {
    id: 'log_004',
    level: 'debug',
    message: 'Processing request',
    context: { endpoint: '/api/chat' },
    source: 'api/chat',
    requestId: 'req_456',
    createdAt: new Date('2024-01-01T10:03:00Z'),
  },
];

export function createMockLog(overrides: Partial<Log> = {}): Log {
  return {
    id: `log_${Date.now()}`,
    level: 'info',
    message: 'Test log message',
    context: null,
    source: 'test',
    requestId: null,
    createdAt: new Date(),
    ...overrides,
  };
}
