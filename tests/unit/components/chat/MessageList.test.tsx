import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageList } from '@/components/chat/MessageList';
import type { ChatUIMessage } from '@/types';

// Mock ReactMarkdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));

describe('MessageList', () => {
  describe('empty state', () => {
    it('shows empty state message when no messages', () => {
      render(<MessageList messages={[]} isLoading={false} />);

      expect(screen.getByText('Start a conversation by sending a message')).toBeInTheDocument();
    });
  });

  describe('message display', () => {
    it('renders user messages with correct styling', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello there!' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      const messageContainer = screen.getByText('Hello there!').closest('div[class*="max-w"]');
      expect(messageContainer).toHaveClass('bg-blue-500', 'text-white');
    });

    it('renders assistant messages with correct styling', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hello! How can I help?' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      // Assistant messages use markdown rendering
      expect(screen.getByTestId('markdown')).toBeInTheDocument();
      // Check that the message text is present
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    });

    it('aligns user messages to the right', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      const flexContainer = screen.getByText('Hello').closest('div[class*="flex-col"]');
      expect(flexContainer).toHaveClass('items-end');
    });

    it('aligns assistant messages to the left', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hi there' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      const flexContainer = screen.getByTestId('markdown').closest('div[class*="flex-col"]');
      expect(flexContainer).toHaveClass('items-start');
    });

    it('renders multiple messages in order', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          parts: [{ type: 'text', text: 'First message' }],
        },
        {
          id: 'msg_2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Second message' }],
        },
        {
          id: 'msg_3',
          role: 'user',
          parts: [{ type: 'text', text: 'Third message' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
      expect(screen.getByText('Third message')).toBeInTheDocument();
    });
  });

  describe('markdown rendering', () => {
    it('renders assistant messages with markdown', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [{ type: 'text', text: '**Bold** text' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      expect(screen.getByTestId('markdown')).toHaveTextContent('**Bold** text');
    });
  });

  describe('reasoning block', () => {
    it('renders reasoning block with toggle', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Let me think about this...' },
            { type: 'text', text: 'The answer is 42.' },
          ],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      expect(screen.getByText('Thinking')).toBeInTheDocument();
      expect(screen.getByText('The answer is 42.')).toBeInTheDocument();
    });

    it('collapses reasoning block by default', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Let me think about this...' },
            { type: 'text', text: 'The answer is 42.' },
          ],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      // Reasoning text should not be visible when collapsed
      expect(screen.queryByText('Let me think about this...')).not.toBeInTheDocument();
    });

    it('expands reasoning block when clicked', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Let me think about this...' },
            { type: 'text', text: 'The answer is 42.' },
          ],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      const thinkingButton = screen.getByText('Thinking');
      fireEvent.click(thinkingButton);

      expect(screen.getByText('Let me think about this...')).toBeInTheDocument();
    });

    it('collapses reasoning block when clicked again', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Let me think about this...' },
            { type: 'text', text: 'The answer is 42.' },
          ],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      const thinkingButton = screen.getByText('Thinking');

      // Expand
      fireEvent.click(thinkingButton);
      expect(screen.getByText('Let me think about this...')).toBeInTheDocument();

      // Collapse
      fireEvent.click(thinkingButton);
      expect(screen.queryByText('Let me think about this...')).not.toBeInTheDocument();
    });
  });

  describe('metadata display', () => {
    it('displays duration metadata', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Response' }],
          metadata: { durationMs: 1500 },
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      expect(screen.getByText('1.5s')).toBeInTheDocument();
    });

    it('displays token counts', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Response' }],
          metadata: { inputTokens: 10, outputTokens: 20 },
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      expect(screen.getByText('10 → 20 tokens')).toBeInTheDocument();
    });

    it('displays endpoint and model name', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Response' }],
          metadata: { endpointName: 'Test Endpoint', modelName: 'test-model' },
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      expect(screen.getByText('Test Endpoint / test-model')).toBeInTheDocument();
    });

    it('displays all metadata together', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Response' }],
          metadata: {
            durationMs: 2000,
            inputTokens: 50,
            outputTokens: 100,
            endpointName: 'Local',
            modelName: 'llama-3',
          },
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      expect(screen.getByText('Local / llama-3')).toBeInTheDocument();
      expect(screen.getByText('2.0s')).toBeInTheDocument();
      expect(screen.getByText('50 → 100 tokens')).toBeInTheDocument();
    });
  });

  describe('loading indicator', () => {
    it('shows loading indicator when loading and last message is from user', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={true} />);

      // Check for bouncing dots
      const dots = document.querySelectorAll('.animate-bounce');
      expect(dots.length).toBe(3);
    });

    it('does not show loading indicator when not loading', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={false} />);

      const dots = document.querySelectorAll('.animate-bounce');
      expect(dots.length).toBe(0);
    });

    it('does not show loading indicator when last message is from assistant', () => {
      const messages: ChatUIMessage[] = [
        {
          id: 'msg_1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
        {
          id: 'msg_2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hi there!' }],
        },
      ];

      render(<MessageList messages={messages} isLoading={true} />);

      const dots = document.querySelectorAll('.animate-bounce');
      expect(dots.length).toBe(0);
    });
  });
});
