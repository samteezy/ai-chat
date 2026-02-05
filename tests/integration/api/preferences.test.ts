import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => null),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('Preferences API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/preferences', () => {
    it('requires key parameter', async () => {
      const { GET } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Key is required');
    });

    it('returns preference value when found', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({
              key: 'logSavingEnabled',
              value: true,
            }),
          }),
        }),
      } as any);

      const { GET } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences?key=logSavingEnabled');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.key).toBe('logSavingEnabled');
      expect(data.value).toBe(true);
    });

    it('returns null value when preference not found', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      } as any);

      const { GET } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences?key=unknownKey');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.key).toBe('unknownKey');
      expect(data.value).toBeNull();
    });

    it('returns 500 on database error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { GET } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences?key=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch preference');
    });
  });

  describe('PUT /api/preferences', () => {
    it('requires key parameter', async () => {
      const { PUT } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: true }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Key is required');
    });

    it('saves preference with upsert', async () => {
      const { db } = await import('@/lib/db');
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflict,
      });
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      const { PUT } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'logSavingEnabled', value: true }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.key).toBe('logSavingEnabled');
      expect(data.value).toBe(true);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'logSavingEnabled',
          value: true,
        })
      );
    });

    it('handles complex JSON values', async () => {
      const { db } = await import('@/lib/db');
      const mockOnConflict = vi.fn().mockResolvedValue(undefined);
      const mockValues = vi.fn().mockReturnValue({
        onConflictDoUpdate: mockOnConflict,
      });
      vi.mocked(db.insert).mockReturnValue({
        values: mockValues,
      } as any);

      const complexValue = { nested: { array: [1, 2, 3] } };

      const { PUT } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'complexPref', value: complexValue }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.value).toEqual(complexValue);
    });

    it('returns 500 on save error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockRejectedValue(new Error('Save failed')),
        }),
      } as any);

      const { PUT } = await import('@/app/api/preferences/route');
      const request = new Request('http://localhost/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'test', value: 'value' }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save preference');
    });
  });
});
