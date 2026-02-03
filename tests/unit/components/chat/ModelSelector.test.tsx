import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelSelector } from '@/components/chat/ModelSelector';
import { mockEndpoints, mockDefaultEndpoint, mockEndpoint } from '@tests/helpers';

describe('ModelSelector', () => {
  const defaultProps = {
    endpoints: mockEndpoints,
    selectedEndpoint: null,
    selectedModel: '',
    onEndpointChange: vi.fn(),
    onModelChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('endpoint dropdown', () => {
    it('renders endpoint select with placeholder', () => {
      render(<ModelSelector {...defaultProps} />);

      expect(screen.getByLabelText('Endpoint')).toBeInTheDocument();
      expect(screen.getByText('Select endpoint...')).toBeInTheDocument();
    });

    it('renders all endpoints in dropdown', () => {
      render(<ModelSelector {...defaultProps} />);

      const select = screen.getByLabelText('Endpoint');
      expect(select).toHaveTextContent('Default Endpoint (default)');
      expect(select).toHaveTextContent('Test Endpoint');
      expect(select).toHaveTextContent('Test Endpoint With Key');
    });

    it('shows (default) label for default endpoint', () => {
      render(<ModelSelector {...defaultProps} />);

      const select = screen.getByLabelText('Endpoint');
      const options = select.querySelectorAll('option');
      const defaultOption = Array.from(options).find(o => o.textContent?.includes('(default)'));
      expect(defaultOption).toBeTruthy();
      expect(defaultOption?.textContent).toContain('Default Endpoint (default)');
    });

    it('calls onEndpointChange when endpoint is selected', () => {
      render(<ModelSelector {...defaultProps} />);

      const select = screen.getByLabelText('Endpoint');
      fireEvent.change(select, { target: { value: mockEndpoint.id } });

      expect(defaultProps.onEndpointChange).toHaveBeenCalledWith(mockEndpoint);
    });

    it('clears model when endpoint changes', () => {
      render(<ModelSelector {...defaultProps} />);

      const select = screen.getByLabelText('Endpoint');
      fireEvent.change(select, { target: { value: mockEndpoint.id } });

      expect(defaultProps.onModelChange).toHaveBeenCalledWith('');
    });

    it('calls onEndpointChange with null when placeholder is selected', () => {
      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      const select = screen.getByLabelText('Endpoint');
      fireEvent.change(select, { target: { value: '' } });

      expect(defaultProps.onEndpointChange).toHaveBeenCalledWith(null);
    });
  });

  describe('model dropdown', () => {
    it('is disabled when no endpoint is selected', () => {
      render(<ModelSelector {...defaultProps} />);

      const modelSelect = screen.getByLabelText('Model');
      expect(modelSelect).toBeDisabled();
    });

    it('shows "Select endpoint first" when no endpoint selected', () => {
      render(<ModelSelector {...defaultProps} />);

      expect(screen.getByText('Select endpoint first')).toBeInTheDocument();
    });

    it('is enabled when endpoint is selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }]),
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        const modelSelect = screen.getByLabelText('Model');
        expect(modelSelect).not.toBeDisabled();
      });
    });

    it('shows "Loading models..." while fetching', async () => {
      let resolvePromise: (value: { id: string }[]) => void;
      const promise = new Promise<{ id: string }[]>((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => promise,
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      expect(screen.getByText('Loading models...')).toBeInTheDocument();

      resolvePromise!([{ id: 'model-1' }]);
      await waitFor(() => {
        expect(screen.queryByText('Loading models...')).not.toBeInTheDocument();
      });
    });
  });

  describe('model fetching', () => {
    it('fetches models when endpoint is selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }, { id: 'model-2' }]),
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/models?endpointId=${mockEndpoint.id}`
        );
      });
    });

    it('displays fetched models in dropdown', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }, { id: 'model-2' }]),
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        const modelSelect = screen.getByLabelText('Model');
        expect(modelSelect).toHaveTextContent('model-1');
        expect(modelSelect).toHaveTextContent('model-2');
      });
    });

    it('auto-selects first model when none is selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }, { id: 'model-2' }]),
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        expect(defaultProps.onModelChange).toHaveBeenCalledWith('model-1');
      });
    });

    it('does not auto-select if model is already selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }, { id: 'model-2' }]),
      });

      render(
        <ModelSelector
          {...defaultProps}
          selectedEndpoint={mockEndpoint}
          selectedModel="model-2"
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Should not call onModelChange since selectedModel is already set
      expect(defaultProps.onModelChange).not.toHaveBeenCalled();
    });

    it('calls onModelChange when model is selected', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 'model-1' }, { id: 'model-2' }]),
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        expect(screen.getByText('model-1')).toBeInTheDocument();
      });

      vi.clearAllMocks();

      const modelSelect = screen.getByLabelText('Model');
      fireEvent.change(modelSelect, { target: { value: 'model-2' } });

      expect(defaultProps.onModelChange).toHaveBeenCalledWith('model-2');
    });
  });

  describe('error handling', () => {
    it('displays error message on fetch failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Connection failed' }),
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });

    it('displays generic error message on exception', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('clears models on error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' }),
      });

      render(<ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />);

      await waitFor(() => {
        const modelSelect = screen.getByLabelText('Model');
        const options = modelSelect.querySelectorAll('option');
        // Only the placeholder option should remain
        expect(options.length).toBe(1);
      });
    });
  });

  describe('clearing endpoint', () => {
    it('clears models when endpoint is cleared', () => {
      const { rerender } = render(
        <ModelSelector {...defaultProps} selectedEndpoint={mockEndpoint} />
      );

      rerender(<ModelSelector {...defaultProps} selectedEndpoint={null} />);

      const modelSelect = screen.getByLabelText('Model');
      expect(modelSelect).toBeDisabled();
    });
  });
});
