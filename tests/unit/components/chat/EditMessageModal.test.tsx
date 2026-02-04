import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditMessageModal } from '@/components/chat/EditMessageModal';

describe('EditMessageModal', () => {
  describe('visibility', () => {
    it('renders when isOpen is true', () => {
      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Edit Message')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <EditMessageModal
          isOpen={false}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.queryByText('Edit Message')).not.toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('pre-fills textarea with initial content', () => {
      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello world"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText('Enter your message...');
      expect(textarea).toHaveValue('Hello world');
    });

    it('updates content as user types', () => {
      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText('Enter your message...');
      fireEvent.change(textarea, { target: { value: 'Updated message' } });

      expect(textarea).toHaveValue('Updated message');
    });
  });

  describe('buttons', () => {
    it('calls onCancel when Cancel button is clicked', () => {
      const onCancel = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={onCancel}
        />
      );

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });

    it('calls onSave with trimmed content when Save button is clicked', () => {
      const onSave = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="  Hello world  "
          onSave={onSave}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('Save & Regenerate'));

      expect(onSave).toHaveBeenCalledWith('Hello world');
    });

    it('disables Save button when content is empty', () => {
      render(
        <EditMessageModal
          isOpen={true}
          initialContent=""
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const saveButton = screen.getByText('Save & Regenerate');
      expect(saveButton).toBeDisabled();
    });

    it('disables Save button when content is whitespace only', () => {
      render(
        <EditMessageModal
          isOpen={true}
          initialContent="   "
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const saveButton = screen.getByText('Save & Regenerate');
      expect(saveButton).toBeDisabled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('calls onCancel when Escape is pressed', () => {
      const onCancel = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={onCancel}
        />
      );

      const textarea = screen.getByPlaceholderText('Enter your message...');
      fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(onCancel).toHaveBeenCalled();
    });

    it('calls onSave when Ctrl+Enter is pressed', () => {
      const onSave = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={onSave}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText('Enter your message...');
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      expect(onSave).toHaveBeenCalledWith('Hello');
    });

    it('calls onSave when Meta+Enter is pressed (Mac)', () => {
      const onSave = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={onSave}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText('Enter your message...');
      fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

      expect(onSave).toHaveBeenCalledWith('Hello');
    });

    it('does not call onSave when Enter without modifier is pressed', () => {
      const onSave = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={onSave}
          onCancel={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText('Enter your message...');
      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('backdrop click', () => {
    it('calls onCancel when backdrop is clicked', () => {
      const onCancel = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={onCancel}
        />
      );

      // Click on the backdrop (the fixed overlay)
      const backdrop = screen.getByText('Edit Message').closest('div[class*="fixed"]');
      fireEvent.click(backdrop!);

      expect(onCancel).toHaveBeenCalled();
    });

    it('does not call onCancel when modal content is clicked', () => {
      const onCancel = vi.fn();

      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={onCancel}
        />
      );

      // Click on the modal content (the white box)
      fireEvent.click(screen.getByText('Edit Message'));

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('help text', () => {
    it('shows keyboard shortcut hints', () => {
      render(
        <EditMessageModal
          isOpen={true}
          initialContent="Hello"
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(screen.getByText('Press Ctrl+Enter to save, Escape to cancel')).toBeInTheDocument();
    });
  });
});
