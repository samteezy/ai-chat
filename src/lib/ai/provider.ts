import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { Endpoint } from '@/lib/db/schema';

export function createProvider(endpoint: Endpoint) {
  return createOpenAICompatible({
    name: endpoint.name,
    baseURL: endpoint.baseUrl,
    apiKey: endpoint.apiKey || 'not-required',
    includeUsage: true,
  });
}

export type Provider = ReturnType<typeof createProvider>;
