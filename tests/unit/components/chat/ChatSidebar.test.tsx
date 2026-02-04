import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { mockChats, mockEndpoints } from '@tests/helpers';

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

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockConfirm.mockReturnValue(true);
  });

  describe('rendering', () => {
    it('renders the sidebar with header', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      expect(screen.getByText('AI Chat')).toBeInTheDocument();
    });

    it('renders all chats', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.getByText('Second Chat')).toBeInTheDocument();
      expect(screen.getByText('Third Chat')).toBeInTheDocument();
    });

    it('renders settings link', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      expect(screen.getByPlaceholderText('Search chats and messages...')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('calls search API and filters chats by search query', async () => {
      const searchResults = [mockChats[0]]; // Only "First Chat"
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(searchResults),
      });

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search chats and messages...');
      fireEvent.change(searchInput, { target: { value: 'First' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/chats/search?q=First');
      });

      await waitFor(() => {
        expect(screen.getByText('First Chat')).toBeInTheDocument();
        expect(screen.queryByText('Second Chat')).not.toBeInTheDocument();
      });
    });

    it('shows clear button when search has text', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search chats and messages...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getByTitle('Clear search')).toBeInTheDocument();
    });

    it('clears search and shows all chats when clear button is clicked', async () => {
      const searchResults = [mockChats[0]];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(searchResults),
      });

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search chats and messages...');
      fireEvent.change(searchInput, { target: { value: 'First' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      const clearButton = screen.getByTitle('Clear search');
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      // After clearing, all chats should be visible again
      expect(screen.getByText('First Chat')).toBeInTheDocument();
      expect(screen.getByText('Second Chat')).toBeInTheDocument();
      expect(screen.getByText('Third Chat')).toBeInTheDocument();
    });

    it('shows empty state when no chats match search', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search chats and messages...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No chats yet')).toBeInTheDocument();
      });
    });

    it('handles search API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search chats and messages...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Search failed:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('multi-select with Ctrl/Cmd+click', () => {
    it('selects a chat with Ctrl+click', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      // Check that the chat has selection styling
      expect(firstChat).toHaveClass('bg-blue-100');
    });

    it('toggles selection on subsequent Ctrl+click', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;

      // Select
      fireEvent.click(firstChat, { ctrlKey: true });
      expect(firstChat).toHaveClass('bg-blue-100');

      // Deselect
      fireEvent.click(firstChat, { ctrlKey: true });
      expect(firstChat).not.toHaveClass('bg-blue-100');
    });

    it('selects multiple chats with Ctrl+click', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      const secondChat = screen.getByText('Second Chat').closest('a')!;

      fireEvent.click(firstChat, { ctrlKey: true });
      fireEvent.click(secondChat, { ctrlKey: true });

      expect(firstChat).toHaveClass('bg-blue-100');
      expect(secondChat).toHaveClass('bg-blue-100');
    });
  });

  describe('range select with Shift+click', () => {
    it('selects a range of chats with Shift+click', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      const thirdChat = screen.getByText('Third Chat').closest('a')!;
      const secondChat = screen.getByText('Second Chat').closest('a')!;

      // First click to set the anchor
      fireEvent.click(firstChat, { ctrlKey: true });

      // Shift+click to select range
      fireEvent.click(thirdChat, { shiftKey: true });

      expect(firstChat).toHaveClass('bg-blue-100');
      expect(secondChat).toHaveClass('bg-blue-100');
      expect(thirdChat).toHaveClass('bg-blue-100');
    });
  });

  describe('selection mode behavior', () => {
    it('shows bulk delete bar when items are selected', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      expect(screen.getByText('1 chat selected')).toBeInTheDocument();
    });

    it('updates count when selecting multiple chats', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      const secondChat = screen.getByText('Second Chat').closest('a')!;

      fireEvent.click(firstChat, { ctrlKey: true });
      fireEvent.click(secondChat, { ctrlKey: true });

      expect(screen.getByText('2 chats selected')).toBeInTheDocument();
    });

    it('clears selection with Cancel button', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('1 chat selected')).not.toBeInTheDocument();
      expect(firstChat).not.toHaveClass('bg-blue-100');
    });

    it('clears selection with Escape key', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      expect(screen.getByText('1 chat selected')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByText('1 chat selected')).not.toBeInTheDocument();
    });

    it('toggles selection when clicking in selection mode without modifiers', () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      const secondChat = screen.getByText('Second Chat').closest('a')!;

      // Enter selection mode with Ctrl+click
      fireEvent.click(firstChat, { ctrlKey: true });

      // Click without modifier in selection mode should toggle
      fireEvent.click(secondChat);

      expect(secondChat).toHaveClass('bg-blue-100');
    });
  });

  describe('bulk delete', () => {
    it('calls bulk delete API with selected IDs', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      const secondChat = screen.getByText('Second Chat').closest('a')!;

      fireEvent.click(firstChat, { ctrlKey: true });
      fireEvent.click(secondChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringMatching(/\/api\/chats\?ids=(chat_001,chat_002|chat_002,chat_001)/),
          { method: 'DELETE' }
        );
      });
    });

    it('shows confirmation dialog before bulk delete', async () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith('Delete 1 chat?');
    });

    it('shows plural in confirmation for multiple chats', async () => {
      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      const secondChat = screen.getByText('Second Chat').closest('a')!;

      fireEvent.click(firstChat, { ctrlKey: true });
      fireEvent.click(secondChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith('Delete 2 chats?');
    });

    it('does not delete if confirmation is cancelled', async () => {
      mockConfirm.mockReturnValue(false);

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('redirects to home when deleting active chat in bulk', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          activeChatId="chat_001"
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('refreshes page when bulk deleting non-active chats', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          activeChatId="chat_003"
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('clears selection after successful bulk delete', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('1 chat selected')).not.toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('handles bulk delete errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(
        <ChatSidebar
          chats={mockChats}
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoints[0].id}
        />
      );

      const firstChat = screen.getByText('First Chat').closest('a')!;
      fireEvent.click(firstChat, { ctrlKey: true });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete chats:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});
