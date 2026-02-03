import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => ({
            id: 'ep_123',
            name: 'Test Endpoint',
            baseUrl: 'http://localhost:8080/v1',
            apiKey: null,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  },
}));

vi.mock('@/lib/utils/id', () => ({
  generateChatId: vi.fn(() => 'chat_test123'),
  generateMessageId: vi.fn(() => 'msg_test123'),
}));

vi.mock('@/lib/ai/provider', () => ({
  createProvider: vi.fn(() => {
    return (modelId: string) => ({
      modelId,
      provider: 'test-provider',
    });
  }),
}));

vi.mock('ai', () => ({
  streamText: vi.fn(() => ({
    toDataStreamResponse: () =>
      new Response('data: {"text": "Hello"}\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
  })),
}));

describe('Chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/chat', () => {
    it('requires endpointId and model', async () => {
      const { POST } = await import('@/app/api/chat/route');

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Endpoint ID and model are required');
    });

    it('returns 404 for non-existent endpoint', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(null),
          }),
        }),
      } as any);

      const { POST } = await import('@/app/api/chat/route');

      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          endpointId: 'ep_nonexistent',
          model: 'test-model',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Endpoint not found');
    });
  });
});
