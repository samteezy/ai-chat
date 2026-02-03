import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EndpointSettings } from '@/components/settings/EndpointSettings';
import { mockEndpoints, mockEndpoint } from '@tests/helpers';

// Mock child components
vi.mock('@/components/settings/EndpointForm', () => ({
  EndpointForm: ({ endpoint, onCancel, onSaveComplete }: any) => (
    <div data-testid="endpoint-form">
      <span data-testid="form-mode">{endpoint ? 'edit' : 'add'}</span>
      {endpoint && <span data-testid="editing-id">{endpoint.id}</span>}
      {onCancel && (
        <button data-testid="form-cancel" onClick={onCancel}>
          Cancel
        </button>
      )}
      <button data-testid="form-save" onClick={onSaveComplete}>
        Save
      </button>
    </div>
  ),
}));

vi.mock('@/components/settings/EndpointList', () => ({
  EndpointList: ({ endpoints, onEdit, editingEndpointId }: any) => (
    <div data-testid="endpoint-list">
      {endpoints.map((ep: any) => (
        <div key={ep.id} data-testid={`endpoint-${ep.id}`}>
          <span>{ep.name}</span>
          {onEdit && (
            <button data-testid={`edit-${ep.id}`} onClick={() => onEdit(ep)}>
              Edit
            </button>
          )}
          {editingEndpointId === ep.id && <span data-testid="editing-marker">Editing</span>}
        </div>
      ))}
    </div>
  ),
}));

describe('EndpointSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders EndpointForm', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      expect(screen.getByTestId('endpoint-form')).toBeInTheDocument();
    });

    it('renders EndpointList', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      expect(screen.getByTestId('endpoint-list')).toBeInTheDocument();
    });

    it('renders section headings', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      expect(screen.getByText('Add Endpoint')).toBeInTheDocument();
      expect(screen.getByText('Saved Endpoints')).toBeInTheDocument();
    });
  });

  describe('add mode', () => {
    it('shows "Add Endpoint" heading when not editing', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      expect(screen.getByText('Add Endpoint')).toBeInTheDocument();
    });

    it('form is in add mode when not editing', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      expect(screen.getByTestId('form-mode')).toHaveTextContent('add');
    });

    it('form does not have cancel button when not editing', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      expect(screen.queryByTestId('form-cancel')).not.toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('shows "Edit Endpoint" heading when editing', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByTestId(`edit-${mockEndpoint.id}`));

      expect(screen.getByText('Edit Endpoint')).toBeInTheDocument();
    });

    it('form is in edit mode when editing', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByTestId(`edit-${mockEndpoint.id}`));

      expect(screen.getByTestId('form-mode')).toHaveTextContent('edit');
    });

    it('passes endpoint to form when editing', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByTestId(`edit-${mockEndpoint.id}`));

      expect(screen.getByTestId('editing-id')).toHaveTextContent(mockEndpoint.id);
    });

    it('form has cancel button when editing', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByTestId(`edit-${mockEndpoint.id}`));

      expect(screen.getByTestId('form-cancel')).toBeInTheDocument();
    });

    it('passes editing endpoint ID to list', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      fireEvent.click(screen.getByTestId(`edit-${mockEndpoint.id}`));

      expect(screen.getByTestId('editing-marker')).toBeInTheDocument();
    });
  });

  describe('cancel editing', () => {
    it('returns to add mode when cancel is clicked', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      // Enter edit mode
      fireEvent.click(screen.getByTestId(`edit-${mockEndpoint.id}`));
      expect(screen.getByText('Edit Endpoint')).toBeInTheDocument();

      // Cancel
      fireEvent.click(screen.getByTestId('form-cancel'));

      expect(screen.getByText('Add Endpoint')).toBeInTheDocument();
      expect(screen.getByTestId('form-mode')).toHaveTextContent('add');
    });
  });

  describe('save complete', () => {
    it('returns to add mode after save complete', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      // Enter edit mode
      fireEvent.click(screen.getByTestId(`edit-${mockEndpoint.id}`));
      expect(screen.getByText('Edit Endpoint')).toBeInTheDocument();

      // Save
      fireEvent.click(screen.getByTestId('form-save'));

      expect(screen.getByText('Add Endpoint')).toBeInTheDocument();
      expect(screen.getByTestId('form-mode')).toHaveTextContent('add');
    });
  });

  describe('switching endpoints', () => {
    it('can switch to editing a different endpoint', () => {
      render(<EndpointSettings endpoints={mockEndpoints} />);

      // Edit first endpoint
      fireEvent.click(screen.getByTestId(`edit-${mockEndpoints[0].id}`));
      expect(screen.getByTestId('editing-id')).toHaveTextContent(mockEndpoints[0].id);

      // Edit second endpoint
      fireEvent.click(screen.getByTestId(`edit-${mockEndpoints[1].id}`));
      expect(screen.getByTestId('editing-id')).toHaveTextContent(mockEndpoints[1].id);
    });
  });
});
