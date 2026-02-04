import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          all: vi.fn(() => []),
        })),
        where: vi.fn(() => ({
          all: vi.fn(() => []),
        })),
      })),
    })),
  },
}));

describe('Chats Search API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/chats/search', () => {
    it('returns all chats when no query is provided', async () => {
      const mockChats = [
        { id: 'chat_1', title: 'Test Chat' },
        { id: 'chat_2', title: 'Another Chat' },
      ];

      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockChats),
          }),
        }),
      } as any);

      const { GET } = await import('@/app/api/chats/search/route');

      const request = new Request('http://localhost/api/chats/search', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockChats);
    });

    it('returns all chats when query is empty string', async () => {
      const mockChats = [{ id: 'chat_1', title: 'Test Chat' }];

      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockChats),
          }),
        }),
      } as any);

      const { GET } = await import('@/app/api/chats/search/route');

      const request = new Request('http://localhost/api/chats/search?q=', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockChats);
    });

    it('searches chats by title and message content', async () => {
      const mockChatsByTitle = [
        { id: 'chat_1', title: 'Test Chat', updatedAt: new Date('2024-01-02') },
      ];
      const mockMatchingMessages = [{ chatId: 'chat_2' }];
      const mockChatsByMessage = [
        { id: 'chat_2', title: 'Another Chat', updatedAt: new Date('2024-01-01') },
      ];

      const { db } = await import('@/lib/db');

      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: search chats by title
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue(mockChatsByTitle),
              }),
            }),
          } as any;
        } else if (callCount === 2) {
          // Second call: search messages
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue(mockMatchingMessages),
              }),
            }),
          } as any;
        } else {
          // Third call: get chats by IDs from message search
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                all: vi.fn().mockReturnValue(mockChatsByMessage),
              }),
            }),
          } as any;
        }
      });

      const { GET } = await import('@/app/api/chats/search/route');

      const request = new Request('http://localhost/api/chats/search?q=test', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(2);
    });

    it('returns 500 on database error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { GET } = await import('@/app/api/chats/search/route');

      const request = new Request('http://localhost/api/chats/search?q=test', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search chats');
    });

    it('returns empty array when no matches found', async () => {
      const { db } = await import('@/lib/db');

      let callCount = 0;
      vi.mocked(db.select).mockImplementation(() => {
        callCount++;
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              all: vi.fn().mockReturnValue([]),
            }),
          }),
        } as any;
      });

      const { GET } = await import('@/app/api/chats/search/route');

      const request = new Request('http://localhost/api/chats/search?q=nonexistent', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });
});
