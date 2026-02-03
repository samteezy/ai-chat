import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '@/components/chat/MessageInput';

describe('MessageInput', () => {
  const defaultProps = {
    input: '',
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders textarea and submit button', () => {
      render(<MessageInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument();
    });

    it('displays the input value', () => {
      render(<MessageInput {...defaultProps} input="Hello world" />);

      expect(screen.getByDisplayValue('Hello world')).toBeInTheDocument();
    });
  });

  describe('input handling', () => {
    it('calls onInputChange when typing', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('Type a message...');
      await user.type(textarea, 'test');

      expect(defaultProps.onInputChange).toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('submits form when Enter is pressed (without Shift)', async () => {
      const onSubmit = vi.fn((e) => e.preventDefault());
      render(
        <MessageInput
          {...defaultProps}
          input="Hello"
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).toHaveBeenCalled();
    });

    it('allows newline when Shift+Enter is pressed', () => {
      const onSubmit = vi.fn();
      render(
        <MessageInput
          {...defaultProps}
          input="Hello"
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit on Enter when input is empty', () => {
      const onSubmit = vi.fn();
      render(
        <MessageInput
          {...defaultProps}
          input=""
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit on Enter when input is only whitespace', () => {
      const onSubmit = vi.fn();
      render(
        <MessageInput
          {...defaultProps}
          input="   "
          onSubmit={onSubmit}
        />
      );

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit on Enter when disabled', () => {
      const onSubmit = vi.fn();
      render(
        <MessageInput
          {...defaultProps}
          input="Hello"
          onSubmit={onSubmit}
          disabled={true}
        />
      );

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit on Enter when loading', () => {
      const onSubmit = vi.fn();
      render(
        <MessageInput
          {...defaultProps}
          input="Hello"
          onSubmit={onSubmit}
          isLoading={true}
        />
      );

      const textarea = screen.getByPlaceholderText('Type a message...');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('disabled states', () => {
    it('disables button when isLoading is true', () => {
      render(<MessageInput {...defaultProps} isLoading={true} input="Hello" />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables button when disabled prop is true', () => {
      render(<MessageInput {...defaultProps} disabled={true} input="Hello" />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables button when input is empty', () => {
      render(<MessageInput {...defaultProps} input="" />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables button when input is only whitespace', () => {
      render(<MessageInput {...defaultProps} input="   " />);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables textarea when isLoading is true', () => {
      render(<MessageInput {...defaultProps} isLoading={true} />);

      expect(screen.getByPlaceholderText('Type a message...')).toBeDisabled();
    });

    it('enables button when input has content and not loading/disabled', () => {
      render(<MessageInput {...defaultProps} input="Hello" />);

      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('loading indicator', () => {
    it('shows spinner when loading', () => {
      render(<MessageInput {...defaultProps} isLoading={true} />);

      // The spinner has animate-spin class
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('shows send icon when not loading', () => {
      render(<MessageInput {...defaultProps} isLoading={false} />);

      const button = screen.getByRole('button');
      const svg = button.querySelector('svg');
      expect(svg).not.toHaveClass('animate-spin');
    });
  });
});
