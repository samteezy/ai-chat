import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EndpointList } from '@/components/settings/EndpointList';
import { mockEndpoints, mockEndpoint, mockDefaultEndpoint } from '@tests/helpers';

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('EndpointList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockConfirm.mockReturnValue(true);
  });

  describe('empty state', () => {
    it('shows empty state message when no endpoints', () => {
      render(<EndpointList endpoints={[]} />);

      expect(screen.getByText('No endpoints configured yet')).toBeInTheDocument();
    });
  });

  describe('endpoint rendering', () => {
    it('renders all endpoints', () => {
      render(<EndpointList endpoints={mockEndpoints} />);

      expect(screen.getByText('Default Endpoint')).toBeInTheDocument();
      expect(screen.getByText('Test Endpoint')).toBeInTheDocument();
      expect(screen.getByText('Test Endpoint With Key')).toBeInTheDocument();
    });

    it('displays endpoint base URL', () => {
      render(<EndpointList endpoints={[mockEndpoint]} />);

      expect(screen.getByText(mockEndpoint.baseUrl)).toBeInTheDocument();
    });

    it('shows "API key configured" when endpoint has API key', () => {
      const endpointWithKey = { ...mockEndpoint, apiKey: 'sk-test' };
      render(<EndpointList endpoints={[endpointWithKey]} />);

      expect(screen.getByText('API key configured')).toBeInTheDocument();
    });

    it('does not show "API key configured" when no API key', () => {
      render(<EndpointList endpoints={[mockEndpoint]} />);

      expect(screen.queryByText('API key configured')).not.toBeInTheDocument();
    });
  });

  describe('default badge', () => {
    it('shows Default badge for default endpoint', () => {
      render(<EndpointList endpoints={[mockDefaultEndpoint]} />);

      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('does not show Default badge for non-default endpoints', () => {
      render(<EndpointList endpoints={[mockEndpoint]} />);

      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });
  });

  describe('set default functionality', () => {
    it('shows "Set default" button for non-default endpoints', () => {
      render(<EndpointList endpoints={[mockEndpoint]} />);

      expect(screen.getByText('Set default')).toBeInTheDocument();
    });

    it('does not show "Set default" button for default endpoint', () => {
      render(<EndpointList endpoints={[mockDefaultEndpoint]} />);

      expect(screen.queryByText('Set default')).not.toBeInTheDocument();
    });

    it('calls API to set default when clicked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<EndpointList endpoints={[mockEndpoint]} />);

      fireEvent.click(screen.getByText('Set default'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/endpoints', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockEndpoint,
            isDefault: true,
          }),
        });
      });
    });

    it('refreshes page after setting default', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<EndpointList endpoints={[mockEndpoint]} />);

      fireEvent.click(screen.getByText('Set default'));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('edit functionality', () => {
    it('shows Edit button when onEdit is provided', () => {
      render(<EndpointList endpoints={[mockEndpoint]} onEdit={() => {}} />);

      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('does not show Edit button when onEdit is not provided', () => {
      render(<EndpointList endpoints={[mockEndpoint]} />);

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('calls onEdit with endpoint when Edit is clicked', () => {
      const onEdit = vi.fn();
      render(<EndpointList endpoints={[mockEndpoint]} onEdit={onEdit} />);

      fireEvent.click(screen.getByText('Edit'));

      expect(onEdit).toHaveBeenCalledWith(mockEndpoint);
    });

    it('highlights endpoint being edited', () => {
      render(
        <EndpointList
          endpoints={[mockEndpoint]}
          onEdit={() => {}}
          editingEndpointId={mockEndpoint.id}
        />
      );

      const card = screen.getByText(mockEndpoint.name).closest('div[class*="rounded-lg"]');
      expect(card).toHaveClass('border-blue-500', 'ring-1', 'ring-blue-500');
    });

    it('disables Edit button when endpoint is being edited', () => {
      render(
        <EndpointList
          endpoints={[mockEndpoint]}
          onEdit={() => {}}
          editingEndpointId={mockEndpoint.id}
        />
      );

      expect(screen.getByText('Edit')).toBeDisabled();
    });
  });

  describe('delete functionality', () => {
    it('shows confirmation dialog before delete', () => {
      render(<EndpointList endpoints={[mockEndpoint]} />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg path[d*="M19 7l"]')
      );
      fireEvent.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalledWith('Delete this endpoint?');
    });

    it('does not delete if confirmation is cancelled', async () => {
      mockConfirm.mockReturnValue(false);

      render(<EndpointList endpoints={[mockEndpoint]} />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg path[d*="M19 7l"]')
      );
      fireEvent.click(deleteButtons[0]);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('calls API to delete when confirmed', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<EndpointList endpoints={[mockEndpoint]} />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg path[d*="M19 7l"]')
      );
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/endpoints?id=${mockEndpoint.id}`, {
          method: 'DELETE',
        });
      });
    });

    it('refreshes page after successful delete', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      render(<EndpointList endpoints={[mockEndpoint]} />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg path[d*="M19 7l"]')
      );
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('does not refresh on delete failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

      render(<EndpointList endpoints={[mockEndpoint]} />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg path[d*="M19 7l"]')
      );
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('disables delete button when endpoint is being edited', () => {
      render(
        <EndpointList
          endpoints={[mockEndpoint]}
          onEdit={() => {}}
          editingEndpointId={mockEndpoint.id}
        />
      );

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg path[d*="M19 7l"]')
      );
      expect(deleteButtons[0]).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('handles delete fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<EndpointList endpoints={[mockEndpoint]} />);

      const deleteButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('svg path[d*="M19 7l"]')
      );
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete endpoint:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles set default fetch errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<EndpointList endpoints={[mockEndpoint]} />);

      fireEvent.click(screen.getByText('Set default'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to set default:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });
});
