import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        all: vi.fn(() => []),
        where: vi.fn(() => ({
          get: vi.fn(() => null),
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
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

vi.mock('@/lib/utils/id', () => ({
  generateEndpointId: vi.fn(() => 'ep_test123'),
}));

describe('Endpoints API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/endpoints', () => {
    it('validates required fields', async () => {
      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }), // missing baseUrl
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and baseUrl are required');
    });
  });

  describe('DELETE /api/endpoints', () => {
    it('requires endpoint ID', async () => {
      const { DELETE } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Endpoint ID is required');
    });
  });
});
