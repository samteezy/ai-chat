import { describe, it, expect } from 'vitest';
import { createProvider } from '@/lib/ai/provider';
import type { Endpoint } from '@/lib/db/schema';

describe('createProvider', () => {
  it('creates a provider with correct configuration', () => {
    const endpoint: Endpoint = {
      id: 'ep_123',
      name: 'Test Endpoint',
      baseUrl: 'http://localhost:8080/v1',
      apiKey: 'test-api-key',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const provider = createProvider(endpoint);

    expect(provider).toBeDefined();
    expect(typeof provider).toBe('function');
  });

  it('creates a provider without API key', () => {
    const endpoint: Endpoint = {
      id: 'ep_123',
      name: 'Test Endpoint',
      baseUrl: 'http://localhost:8080/v1',
      apiKey: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const provider = createProvider(endpoint);

    expect(provider).toBeDefined();
    expect(typeof provider).toBe('function');
  });

  it('returns a callable that can create a model instance', () => {
    const endpoint: Endpoint = {
      id: 'ep_123',
      name: 'Test Endpoint',
      baseUrl: 'http://localhost:8080/v1',
      apiKey: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const provider = createProvider(endpoint);
    const model = provider('test-model');

    expect(model).toBeDefined();
  });
});
