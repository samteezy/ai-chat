import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { mockEndpoints, mockEndpoint, mockDefaultEndpoint } from '@tests/helpers';

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock child components to simplify testing
vi.mock('@/components/chat/ModelSelector', () => ({
  ModelSelector: ({ onEndpointChange, onModelChange, selectedEndpoint, selectedModel, endpoints }: any) => (
    <div data-testid="model-selector">
      <select
        data-testid="endpoint-select"
        value={selectedEndpoint?.id || ''}
        onChange={(e) => {
          const ep = endpoints.find((ep: any) => ep.id === e.target.value);
          onEndpointChange(ep || null);
        }}
      >
        <option value="">Select endpoint</option>
        {endpoints.map((ep: any) => (
          <option key={ep.id} value={ep.id}>{ep.name}</option>
        ))}
      </select>
      <select
        data-testid="model-select"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
      >
        <option value="">Select model</option>
        <option value="model-1">model-1</option>
      </select>
    </div>
  ),
}));

vi.mock('@/components/chat/MessageList', () => ({
  MessageList: ({ messages, isLoading }: any) => (
    <div data-testid="message-list">
      {messages.map((m: any) => (
        <div key={m.id} data-testid={`message-${m.id}`}>
          {m.parts?.map((p: any, i: number) => (
            <span key={i}>{p.text}</span>
          ))}
        </div>
      ))}
      {isLoading && <div data-testid="loading-indicator">Loading...</div>}
    </div>
  ),
}));

vi.mock('@/components/chat/MessageInput', () => ({
  MessageInput: ({ input, onInputChange, onSubmit, isLoading, disabled }: any) => (
    <form data-testid="message-input" onSubmit={onSubmit}>
      <input
        data-testid="input-field"
        value={input}
        onChange={onInputChange}
        disabled={isLoading}
      />
      <button type="submit" disabled={disabled || isLoading}>
        Send
      </button>
    </form>
  ),
}));

// Mock useChat
const mockSendMessage = vi.fn();
const mockUseChatReturn = {
  messages: [],
  sendMessage: mockSendMessage,
  status: 'ready' as const,
  error: null,
};

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => mockUseChatReturn),
}));

vi.mock('ai', () => ({
  DefaultChatTransport: class MockTransport {
    constructor() {}
  },
}));

describe('ChatInterface', () => {
  const defaultProps = {
    chatId: '',
    endpoint: null,
    model: '',
    initialMessages: [],
    endpoints: mockEndpoints,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatReturn.messages = [];
    mockUseChatReturn.status = 'ready';
    mockUseChatReturn.error = null;
  });

  describe('rendering', () => {
    it('renders ModelSelector', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
    });

    it('renders MessageList', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('renders MessageInput', () => {
      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });
  });

  describe('initial state', () => {
    it('pre-selects provided endpoint', () => {
      render(<ChatInterface {...defaultProps} endpoint={mockEndpoint} />);

      const endpointSelect = screen.getByTestId('endpoint-select');
      expect(endpointSelect).toHaveValue(mockEndpoint.id);
    });

    it('pre-selects provided model', () => {
      render(
        <ChatInterface
          {...defaultProps}
          endpoint={mockEndpoint}
          model="model-1"
        />
      );

      const modelSelect = screen.getByTestId('model-select');
      expect(modelSelect).toHaveValue('model-1');
    });
  });

  describe('message conversion', () => {
    it('renders with initial messages', () => {
      render(
        <ChatInterface
          {...defaultProps}
          initialMessages={[
            {
              id: 'msg_1',
              role: 'user' as const,
              content: 'Hello',
              parts: [{ type: 'text' as const, text: 'Hello' }],
            },
          ]}
        />
      );

      // Component should render without errors
      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });
  });

  describe('send button disabled states', () => {
    it('disables send button when no endpoint selected', () => {
      render(<ChatInterface {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });

    it('disables send button when no model selected', () => {
      render(<ChatInterface {...defaultProps} endpoint={mockEndpoint} />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when endpoint, model, and input are set', async () => {
      render(
        <ChatInterface
          {...defaultProps}
          endpoint={mockEndpoint}
          model="model-1"
        />
      );

      const inputField = screen.getByTestId('input-field');
      fireEvent.change(inputField, { target: { value: 'Hello' } });

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading indicator when status is submitted', () => {
      mockUseChatReturn.status = 'submitted';

      render(<ChatInterface {...defaultProps} endpoint={mockEndpoint} model="model-1" />);

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('shows loading indicator when status is streaming', () => {
      mockUseChatReturn.status = 'streaming';

      render(<ChatInterface {...defaultProps} endpoint={mockEndpoint} model="model-1" />);

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('does not show loading indicator when status is ready', () => {
      mockUseChatReturn.status = 'ready';

      render(<ChatInterface {...defaultProps} endpoint={mockEndpoint} model="model-1" />);

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  describe('error display', () => {
    it('displays error message when error exists', () => {
      mockUseChatReturn.error = new Error('Something went wrong');

      render(<ChatInterface {...defaultProps} />);

      expect(screen.getByText('Error: Something went wrong')).toBeInTheDocument();
    });

    it('does not display error section when no error', () => {
      mockUseChatReturn.error = null;

      render(<ChatInterface {...defaultProps} />);

      expect(screen.queryByText(/Error:/)).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls sendMessage on form submit', async () => {
      render(
        <ChatInterface
          {...defaultProps}
          endpoint={mockEndpoint}
          model="model-1"
        />
      );

      const inputField = screen.getByTestId('input-field');
      fireEvent.change(inputField, { target: { value: 'Hello' } });

      const form = screen.getByTestId('message-input');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({ text: 'Hello' });
      });
    });

    it('clears input after successful send', async () => {
      render(
        <ChatInterface
          {...defaultProps}
          endpoint={mockEndpoint}
          model="model-1"
        />
      );

      const inputField = screen.getByTestId('input-field');
      fireEvent.change(inputField, { target: { value: 'Hello' } });

      const form = screen.getByTestId('message-input');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(inputField).toHaveValue('');
      });
    });

    it('does not submit when canSend is false', async () => {
      render(<ChatInterface {...defaultProps} />);

      const inputField = screen.getByTestId('input-field');
      fireEvent.change(inputField, { target: { value: 'Hello' } });

      const form = screen.getByTestId('message-input');
      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('does not submit when loading', async () => {
      mockUseChatReturn.status = 'streaming';

      render(
        <ChatInterface
          {...defaultProps}
          endpoint={mockEndpoint}
          model="model-1"
        />
      );

      const inputField = screen.getByTestId('input-field');
      fireEvent.change(inputField, { target: { value: 'Hello' } });

      const form = screen.getByTestId('message-input');
      fireEvent.submit(form);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('endpoint/model changes', () => {
    it('updates selected endpoint when changed', async () => {
      render(<ChatInterface {...defaultProps} />);

      const endpointSelect = screen.getByTestId('endpoint-select');
      fireEvent.change(endpointSelect, { target: { value: mockEndpoint.id } });

      await waitFor(() => {
        expect(endpointSelect).toHaveValue(mockEndpoint.id);
      });
    });

    it('updates selected model when changed', async () => {
      render(
        <ChatInterface {...defaultProps} endpoint={mockEndpoint} />
      );

      const modelSelect = screen.getByTestId('model-select');
      fireEvent.change(modelSelect, { target: { value: 'model-1' } });

      await waitFor(() => {
        expect(modelSelect).toHaveValue('model-1');
      });
    });
  });
});
