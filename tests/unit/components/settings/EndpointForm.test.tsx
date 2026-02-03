import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EndpointForm } from '@/components/settings/EndpointForm';
import { mockEndpoint, mockEndpointWithKey } from '@tests/helpers';

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('EndpointForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<EndpointForm />);

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Base URL')).toBeInTheDocument();
      expect(screen.getByLabelText('API Key (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Set as default endpoint')).toBeInTheDocument();
    });

    it('renders Test button', () => {
      render(<EndpointForm />);

      expect(screen.getByRole('button', { name: 'Test' })).toBeInTheDocument();
    });

    it('renders Add Endpoint button in create mode', () => {
      render(<EndpointForm />);

      expect(screen.getByRole('button', { name: 'Add Endpoint' })).toBeInTheDocument();
    });

    it('renders Update Endpoint button in edit mode', () => {
      render(<EndpointForm endpoint={mockEndpoint} />);

      expect(screen.getByRole('button', { name: 'Update Endpoint' })).toBeInTheDocument();
    });

    it('renders Cancel button when onCancel is provided', () => {
      render(<EndpointForm onCancel={() => {}} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('does not render Cancel button when onCancel is not provided', () => {
      render(<EndpointForm />);

      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    });
  });

  describe('edit mode population', () => {
    it('populates fields when editing an endpoint', () => {
      render(<EndpointForm endpoint={mockEndpointWithKey} />);

      expect(screen.getByLabelText('Name')).toHaveValue(mockEndpointWithKey.name);
      expect(screen.getByLabelText('Base URL')).toHaveValue(mockEndpointWithKey.baseUrl);
      expect(screen.getByLabelText('API Key (optional)')).toHaveValue(mockEndpointWithKey.apiKey);
    });

    it('checks default checkbox when endpoint is default', () => {
      const defaultEndpoint = { ...mockEndpoint, isDefault: true };
      render(<EndpointForm endpoint={defaultEndpoint} />);

      expect(screen.getByLabelText('Set as default endpoint')).toBeChecked();
    });

    it('clears form when endpoint prop changes to null', () => {
      const { rerender } = render(<EndpointForm endpoint={mockEndpoint} />);

      expect(screen.getByLabelText('Name')).toHaveValue(mockEndpoint.name);

      rerender(<EndpointForm endpoint={null} />);

      expect(screen.getByLabelText('Name')).toHaveValue('');
    });
  });

  describe('test connection', () => {
    it('disables Test button when baseUrl is empty', () => {
      render(<EndpointForm />);

      expect(screen.getByRole('button', { name: 'Test' })).toBeDisabled();
    });

    it('enables Test button when baseUrl is provided', async () => {
      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');

      expect(screen.getByRole('button', { name: 'Test' })).not.toBeDisabled();
    });

    it('calls test endpoint API when Test is clicked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, modelCount: 5 }),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Test' }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/endpoints/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1', apiKey: null }),
        });
      });
    });

    it('includes API key in test request when provided', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, modelCount: 5 }),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.type(screen.getByLabelText('API Key (optional)'), 'sk-test-key');
      await user.click(screen.getByRole('button', { name: 'Test' }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/endpoints/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: 'http://localhost:8080/v1', apiKey: 'sk-test-key' }),
        });
      });
    });

    it('shows success message on successful test', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Test' }));

      await waitFor(() => {
        expect(screen.getByText('Connection successful')).toBeInTheDocument();
      });
    });

    it('shows error message on failed test', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Connection refused' }),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Test' }));

      await waitFor(() => {
        expect(screen.getByText('Connection refused')).toBeInTheDocument();
      });
    });

    it('shows generic error message on fetch failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Test' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to test connection')).toBeInTheDocument();
      });
    });

    it('clears test result when URL changes', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Test' }));

      await waitFor(() => {
        expect(screen.getByText('Connection successful')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Base URL'), '/v2');

      await waitFor(() => {
        expect(screen.queryByText('Connection successful')).not.toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('calls POST for new endpoint', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Name'), 'My Endpoint');
      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Add Endpoint' }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/endpoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'My Endpoint',
            baseUrl: 'http://localhost:8080/v1',
            apiKey: null,
            isDefault: false,
          }),
        });
      });
    });

    it('calls PUT for editing endpoint', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const user = userEvent.setup();
      render(<EndpointForm endpoint={mockEndpoint} />);

      await user.clear(screen.getByLabelText('Name'));
      await user.type(screen.getByLabelText('Name'), 'Updated Name');
      await user.click(screen.getByRole('button', { name: 'Update Endpoint' }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/endpoints', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: mockEndpoint.id,
            name: 'Updated Name',
            baseUrl: mockEndpoint.baseUrl,
            apiKey: null,
            isDefault: false,
          }),
        });
      });
    });

    it('shows loading state during submission', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
        promise.then(() => ({ ok: true, json: () => Promise.resolve({}) }))
      );

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Name'), 'My Endpoint');
      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Add Endpoint' }));

      expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled();

      resolvePromise!();
    });

    it('clears form and refreshes on successful create', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Name'), 'My Endpoint');
      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Add Endpoint' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Name')).toHaveValue('');
        expect(mockRefresh).toHaveBeenCalled();
      });
    });

    it('calls onSaveComplete on successful save', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const onSaveComplete = vi.fn();
      const user = userEvent.setup();
      render(<EndpointForm onSaveComplete={onSaveComplete} />);

      await user.type(screen.getByLabelText('Name'), 'My Endpoint');
      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Add Endpoint' }));

      await waitFor(() => {
        expect(onSaveComplete).toHaveBeenCalled();
      });
    });

    it('shows error message on failed save', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Validation failed' }),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Name'), 'My Endpoint');
      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByRole('button', { name: 'Add Endpoint' }));

      await waitFor(() => {
        expect(screen.getByText('Validation failed')).toBeInTheDocument();
      });
    });
  });

  describe('cancel functionality', () => {
    it('calls onCancel when Cancel is clicked', async () => {
      const onCancel = vi.fn();
      const user = userEvent.setup();
      render(<EndpointForm endpoint={mockEndpoint} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('default checkbox', () => {
    it('sends isDefault true when checkbox is checked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const user = userEvent.setup();
      render(<EndpointForm />);

      await user.type(screen.getByLabelText('Name'), 'My Endpoint');
      await user.type(screen.getByLabelText('Base URL'), 'http://localhost:8080/v1');
      await user.click(screen.getByLabelText('Set as default endpoint'));
      await user.click(screen.getByRole('button', { name: 'Add Endpoint' }));

      await waitFor(() => {
        const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        expect(body.isDefault).toBe(true);
      });
    });
  });
});
