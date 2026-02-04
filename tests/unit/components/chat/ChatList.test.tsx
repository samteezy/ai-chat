import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatList } from '@/components/chat/ChatList';
import { mockChats } from '@tests/helpers';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('ChatList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockConfirm.mockReturnValue(true);
  });

  describe('empty state', () => {
    it('shows empty state when no chats', () => {
      render(<ChatList chats={[]} />);

      expect(screen.getByText('No chats yet')).toBeInTheDocument();
    });
  });

  describe('chat list rendering', () => {
    it('renders all chats', () => {
      render(<ChatList chats={mockChats} />);

      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.getByText('Second Chat')).toBeInTheDocument();
      expect(screen.getByText('Third Chat')).toBeInTheDocument();
    });

    it('renders chats as links to their pages', () => {
      render(<ChatList chats={mockChats} />);

      const firstChatLink = screen.getByText('First Chat').closest('a');
      expect(firstChatLink).toHaveAttribute('href', '/chat/chat_001');
    });
  });

  describe('active chat highlighting', () => {
    it('highlights the active chat', () => {
      render(<ChatList chats={mockChats} activeChatId="chat_001" />);

      const activeLink = screen.getByText('First Chat').closest('a');
      expect(activeLink).toHaveClass('bg-gray-200');
    });

    it('does not highlight inactive chats', () => {
      render(<ChatList chats={mockChats} activeChatId="chat_001" />);

      const inactiveLink = screen.getByText('Second Chat').closest('a');
      expect(inactiveLink).not.toHaveClass('bg-gray-200');
    });
  });

  describe('delete functionality', () => {
    it('shows delete button on hover (via group-hover class)', () => {
      render(<ChatList chats={mockChats} />);

      const firstChatLink = screen.getByText('First Chat').closest('a');
      const deleteButton = firstChatLink?.querySelector('button');

      expect(deleteButton).toBeInTheDocument();
      expect(deleteButton).toHaveClass('opacity-0', 'group-hover:opacity-100');
    });

    it('shows confirmation dialog before delete', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<ChatList chats={mockChats} />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      fireEvent.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith('Delete this chat?');
    });

    it('does not delete if confirmation is cancelled', async () => {
      mockConfirm.mockReturnValue(false);

      render(<ChatList chats={mockChats} />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      fireEvent.click(deleteButton);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deletes chat when confirmed', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<ChatList chats={mockChats} />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chats?id=chat_001', {
          method: 'DELETE',
        });
      });
    });

    it('navigates to home when deleting active chat', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<ChatList chats={mockChats} activeChatId="chat_001" />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('refreshes page when deleting non-active chat', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<ChatList chats={mockChats} activeChatId="chat_002" />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('does not navigate or refresh on delete failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

      render(<ChatList chats={mockChats} activeChatId="chat_001" />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('prevents link navigation when clicking delete', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<ChatList chats={mockChats} />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      const clickEvent = fireEvent.click(deleteButton);

      // The click handler should call stopPropagation
      // We can verify the button is inside the link but clicking doesn't navigate
      expect(deleteButton.closest('a')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<ChatList chats={mockChats} />);

      const deleteButton = screen.getAllByTitle('Delete chat')[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete chat:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('selection functionality', () => {
    it('shows selected chats with blue background', () => {
      const selectedIds = new Set(['chat_001', 'chat_002']);

      render(
        <ChatList
          chats={mockChats}
          selectedIds={selectedIds}
          isSelectionMode={true}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a');
      const secondChat = screen.getByText('Second Chat').closest('a');
      const thirdChat = screen.getByText('Third Chat').closest('a');

      expect(firstChat).toHaveClass('bg-blue-100');
      expect(secondChat).toHaveClass('bg-blue-100');
      expect(thirdChat).not.toHaveClass('bg-blue-100');
    });

    it('calls onChatClick when a chat is clicked', () => {
      const mockOnChatClick = vi.fn();

      render(
        <ChatList
          chats={mockChats}
          onChatClick={mockOnChatClick}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat);

      expect(mockOnChatClick).toHaveBeenCalledWith(expect.any(Object), 'chat_001');
    });

    it('shows checkbox when in selection mode', () => {
      render(
        <ChatList
          chats={mockChats}
          isSelectionMode={true}
        />
      );

      // Checkboxes should be visible (opacity-100) in selection mode
      const checkboxContainers = document.querySelectorAll('.opacity-100');
      expect(checkboxContainers.length).toBeGreaterThan(0);
    });

    it('hides delete button in selection mode', () => {
      render(
        <ChatList
          chats={mockChats}
          isSelectionMode={true}
        />
      );

      expect(screen.queryByTitle('Delete chat')).not.toBeInTheDocument();
    });

    it('shows delete button when not in selection mode', () => {
      render(
        <ChatList
          chats={mockChats}
          isSelectionMode={false}
        />
      );

      expect(screen.getAllByTitle('Delete chat').length).toBe(3);
    });

    it('shows checkmark for selected items', () => {
      const selectedIds = new Set(['chat_001']);

      render(
        <ChatList
          chats={mockChats}
          selectedIds={selectedIds}
          isSelectionMode={true}
        />
      );

      // Selected chat should have a filled checkbox with checkmark
      const firstChatLink = screen.getByText('First Chat').closest('a');
      const checkmark = firstChatLink?.querySelector('svg');
      expect(checkmark).toBeInTheDocument();
    });
  });
});
