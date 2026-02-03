import { vi } from 'vitest';

export interface MockFetchResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
  headers?: Headers;
}

export function createMockFetch(response: MockFetchResponse = {}) {
  const defaultResponse: MockFetchResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    headers: new Headers(),
    ...response,
  };

  return vi.fn().mockResolvedValue(defaultResponse);
}

export function createMockFetchSequence(responses: MockFetchResponse[]) {
  const mockFn = vi.fn();
  responses.forEach((response, index) => {
    mockFn.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      headers: new Headers(),
      ...response,
    });
  });
  return mockFn;
}

export function mockGlobalFetch(response: MockFetchResponse = {}) {
  global.fetch = createMockFetch(response);
  return global.fetch as ReturnType<typeof vi.fn>;
}

export function mockFetchError(error: Error | string) {
  const err = typeof error === 'string' ? new Error(error) : error;
  global.fetch = vi.fn().mockRejectedValue(err);
  return global.fetch as ReturnType<typeof vi.fn>;
}

export function mockFetchJson<T>(data: T, options: Partial<MockFetchResponse> = {}) {
  return mockGlobalFetch({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    ...options,
  });
}

export function mockFetchFailure(status: number, statusText: string, body = '') {
  return mockGlobalFetch({
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(body),
  });
}
