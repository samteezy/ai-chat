import type { Endpoint } from '@/lib/db/schema';

export interface Model {
  id: string;
  name: string;
  owned_by?: string;
  created?: number;
}

export interface ModelsResponse {
  object: 'list';
  data: Model[];
}

export async function fetchModels(endpoint: Endpoint): Promise<Model[]> {
  const url = `${endpoint.baseUrl}/models`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (endpoint.apiKey) {
    headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const data: ModelsResponse = await response.json();
  return data.data;
}

export async function testEndpointConnection(endpoint: Endpoint): Promise<boolean> {
  try {
    await fetchModels(endpoint);
    return true;
  } catch {
    return false;
  }
}
