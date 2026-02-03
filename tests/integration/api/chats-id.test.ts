import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => null),
        })),
        orderBy: vi.fn(() => ({
          all: vi.fn(() => []),
        })),
      })),
    })),
  },
}));

describe('Chat by ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/chats/[id]', () => {
    it('returns 404 when chat not found', async () => {
      const { GET } = await import('@/app/api/chats/[id]/route');

      const request = new Request('http://localhost/api/chats/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      // The mock returns null by default, so it should be 404
      expect(response.status).toBe(404);
      expect(data.error).toBe('Chat not found');
    });

    it('returns 404 for non-existent chat', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      } as any);

      const { GET } = await import('@/app/api/chats/[id]/route');

      const request = new Request('http://localhost/api/chats/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Chat not found');
    });

    it('returns 500 on database error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error('Database error');
      });

      const { GET } = await import('@/app/api/chats/[id]/route');

      const request = new Request('http://localhost/api/chats/chat_123');
      const response = await GET(request, { params: Promise.resolve({ id: 'chat_123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch chat');
    });

    it('returns empty messages array if chat has no messages', async () => {
      const mockChat = {
        id: 'chat_123',
        title: 'Test Chat',
        endpointId: 'ep_123',
        model: 'test-model',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const { db } = await import('@/lib/db');

      const mockChatQuery = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockChat),
          }),
        }),
      };

      const mockMessagesQuery = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              all: vi.fn().mockReturnValue([]),
            }),
          }),
        }),
      };

      vi.mocked(db.select)
        .mockReturnValueOnce(mockChatQuery as any)
        .mockReturnValueOnce(mockMessagesQuery as any);

      const { GET } = await import('@/app/api/chats/[id]/route');

      const request = new Request('http://localhost/api/chats/chat_123');
      const response = await GET(request, { params: Promise.resolve({ id: 'chat_123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toEqual([]);
    });
  });
});
