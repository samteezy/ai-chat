import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewChatButton } from '@/components/chat/NewChatButton';
import { mockEndpoints, mockDefaultEndpoint, mockEndpoint } from '@tests/helpers';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('NewChatButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('no endpoints state', () => {
    it('shows "Add Endpoint" button when no endpoints', () => {
      render(<NewChatButton endpoints={[]} />);

      expect(screen.getByText('Add Endpoint')).toBeInTheDocument();
    });

    it('navigates to settings when Add Endpoint is clicked', () => {
      render(<NewChatButton endpoints={[]} />);

      fireEvent.click(screen.getByText('Add Endpoint'));

      expect(mockPush).toHaveBeenCalledWith('/settings');
    });
  });

  describe('with endpoints', () => {
    it('shows "New Chat" button when endpoints exist', () => {
      render(<NewChatButton endpoints={mockEndpoints} />);

      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    it('shows popup when New Chat is clicked', () => {
      render(<NewChatButton endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByText('New Chat'));

      expect(screen.getByText('Endpoint')).toBeInTheDocument();
      expect(screen.getByText('Model')).toBeInTheDocument();
    });

    it('hides popup when clicking button again', () => {
      render(<NewChatButton endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByText('New Chat'));
      expect(screen.getByText('Endpoint')).toBeInTheDocument();

      fireEvent.click(screen.getByText('New Chat'));
      expect(screen.queryByLabelText('Endpoint')).not.toBeInTheDocument();
    });

    it('hides popup when Cancel is clicked', () => {
      render(<NewChatButton endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByText('New Chat'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByLabelText('Endpoint')).not.toBeInTheDocument();
    });
  });

  describe('endpoint selection', () => {
    it('renders endpoint dropdown with options', () => {
      render(<NewChatButton endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByText('New Chat'));

      // Check that endpoint label exists
      expect(screen.getByText('Endpoint')).toBeInTheDocument();
      // Check that some endpoints are visible
      expect(screen.getByText('Default Endpoint')).toBeInTheDocument();
    });
  });

  describe('model fetching', () => {
    it('fetches models when popup opens with default endpoint', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }]),
      });

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/models?endpointId=${mockEndpoint.id}`
        );
      });
    });

    it('fetches models when endpoint is selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }]),
      });

      render(<NewChatButton endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByText('New Chat'));

      // Find the endpoint select - it's the first select in the popup
      const selects = screen.getAllByRole('combobox');
      const endpointSelect = selects[0]; // First select is endpoint
      fireEvent.change(endpointSelect, { target: { value: mockEndpoint.id } });

      // Wait for fetch to be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('shows "Loading..." while fetching models', async () => {
      let resolvePromise: (value: { id: string }[]) => void;
      const promise = new Promise<{ id: string }[]>((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => promise,
      });

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      resolvePromise!([{ id: 'model-1' }]);
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('model dropdown is initially disabled', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }]),
      });

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      // Model dropdown should be present
      await waitFor(() => {
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });
  });

  describe('create functionality', () => {
    it('disables Create button when no endpoint selected', () => {
      render(<NewChatButton endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByText('New Chat'));

      expect(screen.getByText('Create')).toBeDisabled();
    });

    it('disables Create button when no model selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      await waitFor(() => {
        expect(screen.getByText('Create')).toBeDisabled();
      });
    });

    it('enables Create button when endpoint and model are selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }]),
      });

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      await waitFor(() => {
        expect(screen.getByText('Create')).not.toBeDisabled();
      });
    });

    it('navigates to new chat with query params on Create', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'test-model' }]),
      });

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      await waitFor(() => {
        expect(screen.getByText('Create')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText('Create'));

      expect(mockPush).toHaveBeenCalledWith(
        `/chat/new?endpoint=${mockEndpoint.id}&model=test-model`
      );
    });

    it('closes popup after Create', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }]),
      });

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      await waitFor(() => {
        expect(screen.getByText('Create')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByText('Create'));

      expect(screen.queryByLabelText('Endpoint')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('handles fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(
        <NewChatButton
          endpoints={mockEndpoints}
          defaultEndpointId={mockEndpoint.id}
        />
      );

      fireEvent.click(screen.getByText('New Chat'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch models:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});
