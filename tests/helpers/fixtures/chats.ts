import type { Chat } from '@/lib/db/schema';

export const mockChat: Chat = {
  id: 'chat_test123',
  title: 'Test Chat',
  endpointId: 'ep_test123',
  model: 'test-model',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockChats: Chat[] = [
  {
    id: 'chat_001',
    title: 'First Chat',
    endpointId: 'ep_test123',
    model: 'model-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-03'),
  },
  {
    id: 'chat_002',
    title: 'Second Chat',
    endpointId: 'ep_test456',
    model: 'model-2',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'chat_003',
    title: 'Third Chat',
    endpointId: 'ep_test123',
    model: 'model-1',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-01'),
  },
];

export function createMockChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: `chat_${Math.random().toString(36).substring(7)}`,
    title: 'Mock Chat',
    endpointId: 'ep_test123',
    model: 'test-model',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
