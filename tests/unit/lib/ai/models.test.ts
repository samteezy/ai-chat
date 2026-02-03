import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchModels, testEndpointConnection } from '@/lib/ai/models';
import type { Endpoint } from '@/lib/db/schema';

describe('models utilities', () => {
  const mockEndpoint: Endpoint = {
    id: 'ep_123',
    name: 'Test Endpoint',
    baseUrl: 'http://localhost:8080/v1',
    apiKey: 'test-key',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchModels', () => {
    it('fetches models from endpoint', async () => {
      const mockModels = [
        { id: 'model-1', name: 'Model 1' },
        { id: 'model-2', name: 'Model 2' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: mockModels }),
      });

      const models = await fetchModels(mockEndpoint);

      expect(fetch).toHaveBeenCalledWith('http://localhost:8080/v1/models', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-key',
        },
      });
      expect(models).toEqual(mockModels);
    });

    it('fetches models without API key', async () => {
      const endpointWithoutKey: Endpoint = {
        ...mockEndpoint,
        apiKey: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: [] }),
      });

      await fetchModels(endpointWithoutKey);

      expect(fetch).toHaveBeenCalledWith('http://localhost:8080/v1/models', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('throws error on failed request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(fetchModels(mockEndpoint)).rejects.toThrow(
        'Failed to fetch models: Internal Server Error'
      );
    });
  });

  describe('testEndpointConnection', () => {
    it('returns true on successful connection', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ object: 'list', data: [] }),
      });

      const result = await testEndpointConnection(mockEndpoint);
      expect(result).toBe(true);
    });

    it('returns false on failed connection', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Connection refused',
      });

      const result = await testEndpointConnection(mockEndpoint);
      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await testEndpointConnection(mockEndpoint);
      expect(result).toBe(false);
    });
  });
});
