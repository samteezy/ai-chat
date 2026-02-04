import type { Message } from '@/lib/db/schema';
import type { ChatUIMessage } from '@/types';

export const mockUserMessage: Message = {
  id: 'msg_user123',
  chatId: 'chat_test123',
  role: 'user',
  content: 'Hello, how are you?',
  parts: null,
  parentMessageId: null,
  versionGroup: 'vg_user123',
  versionNumber: 1,
  status: 'completed',
  error: null,
  createdAt: new Date('2024-01-01T10:00:00'),
  updatedAt: null,
};

export const mockAssistantMessage: Message = {
  id: 'msg_asst123',
  chatId: 'chat_test123',
  role: 'assistant',
  content: 'I am doing well, thank you!',
  parts: [
    { type: 'text', text: 'I am doing well, thank you!' },
  ],
  parentMessageId: 'msg_user123',
  versionGroup: 'vg_asst123',
  versionNumber: 1,
  status: 'completed',
  error: null,
  createdAt: new Date('2024-01-01T10:00:01'),
  updatedAt: null,
};

export const mockAssistantMessageWithReasoning: Message = {
  id: 'msg_asst456',
  chatId: 'chat_test123',
  role: 'assistant',
  content: 'The answer is 42.',
  parts: [
    { type: 'reasoning', text: 'Let me think about this...' },
    { type: 'text', text: 'The answer is 42.' },
    { type: 'metrics', durationMs: 1500, inputTokens: 10, outputTokens: 20, endpointName: 'Test', modelName: 'model-1' },
  ],
  parentMessageId: 'msg_user123',
  versionGroup: 'vg_asst456',
  versionNumber: 1,
  status: 'completed',
  error: null,
  createdAt: new Date('2024-01-01T10:00:02'),
  updatedAt: null,
};

export const mockMessages: Message[] = [
  mockUserMessage,
  mockAssistantMessage,
];

export const mockUIUserMessage: ChatUIMessage = {
  id: 'msg_user123',
  role: 'user',
  parts: [{ type: 'text', text: 'Hello, how are you?' }],
};

export const mockUIAssistantMessage: ChatUIMessage = {
  id: 'msg_asst123',
  role: 'assistant',
  parts: [{ type: 'text', text: 'I am doing well, thank you!' }],
};

export const mockUIAssistantMessageWithReasoning: ChatUIMessage = {
  id: 'msg_asst456',
  role: 'assistant',
  parts: [
    { type: 'reasoning', text: 'Let me think about this...' },
    { type: 'text', text: 'The answer is 42.' },
  ],
  metadata: {
    durationMs: 1500,
    inputTokens: 10,
    outputTokens: 20,
    endpointName: 'Test',
    modelName: 'model-1',
  },
};

export const mockUIMessages: ChatUIMessage[] = [
  mockUIUserMessage,
  mockUIAssistantMessage,
];

export function createMockMessage(overrides: Partial<Message> = {}): Message {
  const id = `msg_${Math.random().toString(36).substring(7)}`;
  return {
    id,
    chatId: 'chat_test123',
    role: 'user',
    content: 'Test message',
    parts: null,
    parentMessageId: null,
    versionGroup: `vg_${id}`,
    versionNumber: 1,
    status: 'completed',
    error: null,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  };
}

export function createMockUIMessage(
  overrides: Partial<ChatUIMessage> = {}
): ChatUIMessage {
  return {
    id: `msg_${Math.random().toString(36).substring(7)}`,
    role: 'user',
    parts: [{ type: 'text', text: 'Test message' }],
    ...overrides,
  };
}
