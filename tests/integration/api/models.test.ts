import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => null),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/ai/models', () => ({
  fetchModels: vi.fn(),
}));

describe('Models API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/models', () => {
    it('validates endpointId is required', async () => {
      const { GET } = await import('@/app/api/models/route');

      const request = new Request('http://localhost/api/models', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Endpoint ID is required');
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

      const { GET } = await import('@/app/api/models/route');

      const request = new Request('http://localhost/api/models?endpointId=ep_nonexistent', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Endpoint not found');
    });

    it('returns models array from fetchModels', async () => {
      const mockEndpoint = {
        id: 'ep_123',
        name: 'Test Endpoint',
        baseUrl: 'http://localhost:8080/v1',
        apiKey: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockModels = [
        { id: 'model-1', name: 'Model 1' },
        { id: 'model-2', name: 'Model 2' },
      ];

      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockEndpoint),
          }),
        }),
      } as any);

      const { fetchModels } = await import('@/lib/ai/models');
      vi.mocked(fetchModels).mockResolvedValue(mockModels);

      const { GET } = await import('@/app/api/models/route');

      const request = new Request('http://localhost/api/models?endpointId=ep_123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockModels);
      expect(fetchModels).toHaveBeenCalledWith(mockEndpoint);
    });

    it('returns 500 on fetchModels error', async () => {
      const mockEndpoint = {
        id: 'ep_123',
        name: 'Test Endpoint',
        baseUrl: 'http://localhost:8080/v1',
        apiKey: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockEndpoint),
          }),
        }),
      } as any);

      const { fetchModels } = await import('@/lib/ai/models');
      vi.mocked(fetchModels).mockRejectedValue(new Error('Failed to connect'));

      const { GET } = await import('@/app/api/models/route');

      const request = new Request('http://localhost/api/models?endpointId=ep_123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to connect');
    });

    it('returns "Unknown error" for non-Error exceptions', async () => {
      const mockEndpoint = {
        id: 'ep_123',
        name: 'Test Endpoint',
        baseUrl: 'http://localhost:8080/v1',
        apiKey: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(mockEndpoint),
          }),
        }),
      } as any);

      const { fetchModels } = await import('@/lib/ai/models');
      vi.mocked(fetchModels).mockRejectedValue('String error');

      const { GET } = await import('@/app/api/models/route');

      const request = new Request('http://localhost/api/models?endpointId=ep_123', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Unknown error');
    });
  });
});
