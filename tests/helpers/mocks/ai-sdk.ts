import { vi } from 'vitest';
import type { ChatUIMessage } from '@/types';

export interface MockUseChatOptions {
  messages?: ChatUIMessage[];
  status?: 'ready' | 'submitted' | 'streaming' | 'error';
  error?: Error | null;
}

export function createMockUseChat(options: MockUseChatOptions = {}) {
  const {
    messages = [],
    status = 'ready',
    error = null,
  } = options;

  return {
    messages,
    sendMessage: vi.fn(),
    status,
    error,
    reload: vi.fn(),
    stop: vi.fn(),
    setMessages: vi.fn(),
  };
}

// Default mock for @ai-sdk/react useChat
export function mockAiSdkReact(options: MockUseChatOptions = {}) {
  return {
    useChat: vi.fn(() => createMockUseChat(options)),
  };
}

// Mock for ai module
export function mockAiModule() {
  return {
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: vi.fn(() =>
        new Response('data: {"text": "Hello"}\n', {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      ),
      toDataStreamResponse: vi.fn(() =>
        new Response('data: {"text": "Hello"}\n', {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      ),
    })),
    wrapLanguageModel: vi.fn((opts) => opts.model),
    extractReasoningMiddleware: vi.fn(() => ({})),
    DefaultChatTransport: vi.fn().mockImplementation(() => ({
      api: '/api/chat',
    })),
  };
}

export function createMockTransport() {
  return {
    api: '/api/chat',
    body: vi.fn(() => ({})),
    fetch: vi.fn(),
  };
}
