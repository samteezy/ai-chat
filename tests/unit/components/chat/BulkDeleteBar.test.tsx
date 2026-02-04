import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkDeleteBar } from '@/components/chat/BulkDeleteBar';

// Mock window.confirm
const mockConfirm = vi.fn();
global.confirm = mockConfirm;

describe('BulkDeleteBar', () => {
  const mockOnCancel = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  describe('rendering', () => {
    it('renders with singular text for one item', () => {
      render(
        <BulkDeleteBar
          selectedCount={1}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('1 chat selected')).toBeInTheDocument();
    });

    it('renders with plural text for multiple items', () => {
      render(
        <BulkDeleteBar
          selectedCount={3}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('3 chats selected')).toBeInTheDocument();
    });

    it('renders Cancel and Delete buttons', () => {
      render(
        <BulkDeleteBar
          selectedCount={1}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('cancel functionality', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      render(
        <BulkDeleteBar
          selectedCount={1}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('Cancel'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete functionality', () => {
    it('shows confirmation dialog when Delete is clicked', () => {
      render(
        <BulkDeleteBar
          selectedCount={1}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));

      expect(mockConfirm).toHaveBeenCalledWith('Delete 1 chat?');
    });

    it('shows plural confirmation for multiple chats', () => {
      render(
        <BulkDeleteBar
          selectedCount={5}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));

      expect(mockConfirm).toHaveBeenCalledWith('Delete 5 chats?');
    });

    it('calls onDelete when confirmation is accepted', () => {
      mockConfirm.mockReturnValue(true);

      render(
        <BulkDeleteBar
          selectedCount={2}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('does not call onDelete when confirmation is cancelled', () => {
      mockConfirm.mockReturnValue(false);

      render(
        <BulkDeleteBar
          selectedCount={2}
          onCancel={mockOnCancel}
          onDelete={mockOnDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));

      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });
});
