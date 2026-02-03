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

  describe('GET /api/endpoints', () => {
    it('returns all endpoints', async () => {
      const mockEndpoints = [
        { id: 'ep_1', name: 'Endpoint 1', baseUrl: 'http://localhost:8080/v1' },
        { id: 'ep_2', name: 'Endpoint 2', baseUrl: 'http://localhost:8081/v1' },
      ];

      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          all: vi.fn().mockReturnValue(mockEndpoints),
        }),
      } as any);

      const { GET } = await import('@/app/api/endpoints/route');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockEndpoints);
    });

    it('returns empty array when no endpoints exist', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          all: vi.fn().mockReturnValue([]),
        }),
      } as any);

      const { GET } = await import('@/app/api/endpoints/route');

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

      const { GET } = await import('@/app/api/endpoints/route');

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch endpoints');
    });
  });

  describe('POST /api/endpoints', () => {
    it('validates required fields (missing baseUrl)', async () => {
      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and baseUrl are required');
    });

    it('validates required fields (missing name)', async () => {
      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name and baseUrl are required');
    });

    it('creates endpoint with generated ID', async () => {
      const { db } = await import('@/lib/db');
      const insertedValues: any[] = [];
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockImplementation((values) => {
          insertedValues.push(values);
          return Promise.resolve();
        }),
      } as any);

      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Endpoint',
          baseUrl: 'http://localhost:8080/v1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('ep_test123');
      expect(insertedValues[0].id).toBe('ep_test123');
    });

    it('unsets other defaults when isDefault is true', async () => {
      const { db } = await import('@/lib/db');
      const mockUpdateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({
        set: mockUpdateSet,
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Default Endpoint',
          baseUrl: 'http://localhost:8080/v1',
          isDefault: true,
        }),
      });

      await POST(request);

      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({ isDefault: false })
      );
    });

    it('does not unset defaults when isDefault is false', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Non-Default Endpoint',
          baseUrl: 'http://localhost:8080/v1',
          isDefault: false,
        }),
      });

      await POST(request);

      expect(db.update).not.toHaveBeenCalled();
    });

    it('sets apiKey to null when not provided', async () => {
      const { db } = await import('@/lib/db');
      const insertedValues: any[] = [];
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockImplementation((values) => {
          insertedValues.push(values);
          return Promise.resolve();
        }),
      } as any);

      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Endpoint',
          baseUrl: 'http://localhost:8080/v1',
        }),
      });

      await POST(request);

      expect(insertedValues[0].apiKey).toBeNull();
    });

    it('returns 500 on create error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Insert failed')),
      } as any);

      const { POST } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Endpoint',
          baseUrl: 'http://localhost:8080/v1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create endpoint');
    });
  });

  describe('PUT /api/endpoints', () => {
    it('requires endpoint ID', async () => {
      const { PUT } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Updated Name',
          baseUrl: 'http://localhost:8080/v1',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Endpoint ID is required');
    });

    it('updates endpoint fields', async () => {
      const updatedEndpoint = {
        id: 'ep_123',
        name: 'Updated Name',
        baseUrl: 'http://updated:8080/v1',
        apiKey: 'sk-new',
        isDefault: false,
      };

      const { db } = await import('@/lib/db');
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue(updatedEndpoint),
          }),
        }),
      } as any);

      const { PUT } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'ep_123',
          name: 'Updated Name',
          baseUrl: 'http://updated:8080/v1',
          apiKey: 'sk-new',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedEndpoint);
    });

    it('unsets other defaults when isDefault is true', async () => {
      const { db } = await import('@/lib/db');
      const mockUpdateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({
        set: mockUpdateSet,
      } as any);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ id: 'ep_123' }),
          }),
        }),
      } as any);

      const { PUT } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'ep_123',
          name: 'Name',
          baseUrl: 'http://localhost:8080/v1',
          isDefault: true,
        }),
      });

      await PUT(request);

      // First call unsets defaults, second call updates the endpoint
      expect(db.update).toHaveBeenCalledTimes(2);
    });

    it('returns 500 on update error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Update failed')),
        }),
      } as any);

      const { PUT } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'ep_123',
          name: 'Name',
          baseUrl: 'http://localhost:8080/v1',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update endpoint');
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

    it('deletes endpoint successfully', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      } as any);

      const { DELETE } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints?id=ep_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('returns 500 on delete error', async () => {
      const { db } = await import('@/lib/db');
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Delete failed')),
      } as any);

      const { DELETE } = await import('@/app/api/endpoints/route');

      const request = new Request('http://localhost/api/endpoints?id=ep_123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete endpoint');
    });
  });
});
