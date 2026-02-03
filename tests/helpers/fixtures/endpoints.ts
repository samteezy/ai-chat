import type { Endpoint } from '@/lib/db/schema';

export const mockEndpoint: Endpoint = {
  id: 'ep_test123',
  name: 'Test Endpoint',
  baseUrl: 'http://localhost:8080/v1',
  apiKey: null,
  isDefault: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockEndpointWithKey: Endpoint = {
  id: 'ep_test456',
  name: 'Test Endpoint With Key',
  baseUrl: 'http://localhost:8081/v1',
  apiKey: 'sk-test-key',
  isDefault: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockDefaultEndpoint: Endpoint = {
  id: 'ep_default',
  name: 'Default Endpoint',
  baseUrl: 'http://localhost:8080/v1',
  apiKey: null,
  isDefault: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockEndpoints: Endpoint[] = [
  mockDefaultEndpoint,
  mockEndpoint,
  mockEndpointWithKey,
];

export function createMockEndpoint(overrides: Partial<Endpoint> = {}): Endpoint {
  return {
    id: `ep_${Math.random().toString(36).substring(7)}`,
    name: 'Mock Endpoint',
    baseUrl: 'http://localhost:8080/v1',
    apiKey: null,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
