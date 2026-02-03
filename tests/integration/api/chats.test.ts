import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          all: vi.fn(() => []),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

describe('Chats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/chats', () => {
    it('returns all chats', async () => {
      const { GET } = await import('@/app/api/chats/route');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('returns empty array when no chats exist', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue([]),
          }),
        }),
      } as any);

      const { GET } = await import('@/app/api/chats/route');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('returns 500 on database error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { GET } = await import('@/app/api/chats/route');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch chats');
    });
  });

  describe('DELETE /api/chats', () => {
    it('requires chat ID', async () => {
      const { DELETE } = await import('@/app/api/chats/route');

      const request = new Request('http://localhost/api/chats', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Chat ID is required');
    });

    it('deletes chat successfully', async () => {
      const { db } = await import('@/lib/db');
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({
        where: mockWhere,
      } as any);

      const { DELETE } = await import('@/app/api/chats/route');

      const request = new Request('http://localhost/api/chats?id=chat_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it('returns 500 on delete error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Delete failed')),
      } as any);

      const { DELETE } = await import('@/app/api/chats/route');

      const request = new Request('http://localhost/api/chats?id=chat_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete chat');
    });
  });
});
