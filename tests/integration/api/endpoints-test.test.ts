import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Endpoint Test API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('POST /api/endpoints/test', () => {
    it('validates baseUrl is required', async () => {
      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Base URL is required');
    });

    it('normalizes trailing slash from baseUrl', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: [] }),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1/' }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/models',
        expect.any(Object)
      );
    });

    it('normalizes multiple trailing slashes', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: [] }),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1///' }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/models',
        expect.any(Object)
      );
    });

    it('includes Authorization header when apiKey is provided', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: [] }),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1', apiKey: 'sk-test' }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/models',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-test',
          },
        }
      );
    });

    it('does not include Authorization header when apiKey is not provided', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: [] }),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/v1/models',
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('returns success with model count on successful connection', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] }),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.modelCount).toBe(3);
    });

    it('returns success with 0 model count when data is not an array', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list' }),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.modelCount).toBe(0);
    });

    it('returns error for failed connection (still 200 status)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key'),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.error).toBe('401 Unauthorized: Invalid API key');
    });

    it('returns error without body text when text fails', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(''),
      });

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.error).toBe('500 Internal Server Error');
    });

    it('returns error for network errors (still 200 status)', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Connection refused');
    });

    it('returns "Unknown error" for non-Error exceptions', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue('String error');

      const { POST } = await import('@/app/api/endpoints/test/route');

      const request = new Request('http://localhost/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unknown error');
    });
  });
});
