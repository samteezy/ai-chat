import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockLogs } from '@tests/helpers/fixtures/logs';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => ({
                all: vi.fn(() => []),
              })),
            })),
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      run: vi.fn(() => Promise.resolve()),
    })),
  },
}));

// Mock the logger to prevent it from trying to use the database
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('Logs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/logs', () => {
    it('returns logs with default pagination', async () => {
      const { db } = await import('@/lib/db');

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockReturnValue(mockLogs),
        get: vi.fn().mockReturnValue({ count: mockLogs.length }),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const { GET } = await import('@/app/api/logs/route');
      const request = new Request('http://localhost/api/logs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('logs');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });

    it('filters by log levels', async () => {
      const { db } = await import('@/lib/db');
      const mockWhere = vi.fn().mockReturnThis();

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: mockWhere,
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockReturnValue([mockLogs[1]]), // error log
        get: vi.fn().mockReturnValue({ count: 1 }),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const { GET } = await import('@/app/api/logs/route');
      const request = new Request('http://localhost/api/logs?levels=error');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('filters by search text', async () => {
      const { db } = await import('@/lib/db');
      const mockWhere = vi.fn().mockReturnThis();

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: mockWhere,
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue({ count: 0 }),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const { GET } = await import('@/app/api/logs/route');
      const request = new Request('http://localhost/api/logs?search=database');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('filters by source', async () => {
      const { db } = await import('@/lib/db');
      const mockWhere = vi.fn().mockReturnThis();

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: mockWhere,
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue({ count: 0 }),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const { GET } = await import('@/app/api/logs/route');
      const request = new Request('http://localhost/api/logs?source=api/chat');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('respects limit parameter', async () => {
      const { db } = await import('@/lib/db');
      const mockLimit = vi.fn().mockReturnThis();

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: mockLimit,
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue({ count: 0 }),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const { GET } = await import('@/app/api/logs/route');
      const request = new Request('http://localhost/api/logs?limit=50');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('caps limit at 1000', async () => {
      const { db } = await import('@/lib/db');
      const mockLimit = vi.fn().mockReturnThis();

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: mockLimit,
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockReturnValue([]),
        get: vi.fn().mockReturnValue({ count: 0 }),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as any);

      const { GET } = await import('@/app/api/logs/route');
      const request = new Request('http://localhost/api/logs?limit=5000');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockLimit).toHaveBeenCalledWith(1000);
    });

    it('returns 500 on database error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { GET } = await import('@/app/api/logs/route');
      const request = new Request('http://localhost/api/logs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch logs');
    });
  });

  describe('DELETE /api/logs', () => {
    it('purges all logs successfully', async () => {
      const { db } = await import('@/lib/db');
      const mockRun = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        run: mockRun,
      } as any);

      const { DELETE } = await import('@/app/api/logs/route');
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 500 on delete error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.delete).mockReturnValue({
        run: vi.fn().mockRejectedValue(new Error('Delete failed')),
      } as any);

      const { DELETE } = await import('@/app/api/logs/route');
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to purge logs');
    });
  });
});
