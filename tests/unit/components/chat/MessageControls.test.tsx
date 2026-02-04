import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageControls } from '@/components/chat/MessageControls';

describe('MessageControls', () => {
  describe('version navigation', () => {
    it('shows version navigation when multiple versions exist', () => {
      const versionInfo = {
        versionGroup: 'vg_1',
        versionNumber: 2,
        totalVersions: 3,
        siblingIds: ['msg_1', 'msg_2', 'msg_3'],
      };

      render(
        <MessageControls
          messageId="msg_2"
          role="user"
          versionInfo={versionInfo}
        />
      );

      expect(screen.getByText('2/3')).toBeInTheDocument();
    });

    it('hides version navigation when only one version exists', () => {
      const versionInfo = {
        versionGroup: 'vg_1',
        versionNumber: 1,
        totalVersions: 1,
        siblingIds: ['msg_1'],
      };

      render(
        <MessageControls
          messageId="msg_1"
          role="user"
          versionInfo={versionInfo}
        />
      );

      expect(screen.queryByText('1/1')).not.toBeInTheDocument();
    });

    it('calls onSwitchVersion with prev when previous button clicked', () => {
      const onSwitchVersion = vi.fn();
      const versionInfo = {
        versionGroup: 'vg_1',
        versionNumber: 2,
        totalVersions: 3,
        siblingIds: ['msg_1', 'msg_2', 'msg_3'],
      };

      render(
        <MessageControls
          messageId="msg_2"
          role="user"
          versionInfo={versionInfo}
          onSwitchVersion={onSwitchVersion}
        />
      );

      fireEvent.click(screen.getByTitle('Previous version'));

      expect(onSwitchVersion).toHaveBeenCalledWith('prev');
    });

    it('calls onSwitchVersion with next when next button clicked', () => {
      const onSwitchVersion = vi.fn();
      const versionInfo = {
        versionGroup: 'vg_1',
        versionNumber: 2,
        totalVersions: 3,
        siblingIds: ['msg_1', 'msg_2', 'msg_3'],
      };

      render(
        <MessageControls
          messageId="msg_2"
          role="user"
          versionInfo={versionInfo}
          onSwitchVersion={onSwitchVersion}
        />
      );

      fireEvent.click(screen.getByTitle('Next version'));

      expect(onSwitchVersion).toHaveBeenCalledWith('next');
    });

    it('disables prev button on first version', () => {
      const onSwitchVersion = vi.fn();
      const versionInfo = {
        versionGroup: 'vg_1',
        versionNumber: 1,
        totalVersions: 3,
        siblingIds: ['msg_1', 'msg_2', 'msg_3'],
      };

      render(
        <MessageControls
          messageId="msg_1"
          role="user"
          versionInfo={versionInfo}
          onSwitchVersion={onSwitchVersion}
        />
      );

      const prevButton = screen.getByTitle('Previous version');
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last version', () => {
      const onSwitchVersion = vi.fn();
      const versionInfo = {
        versionGroup: 'vg_1',
        versionNumber: 3,
        totalVersions: 3,
        siblingIds: ['msg_1', 'msg_2', 'msg_3'],
      };

      render(
        <MessageControls
          messageId="msg_3"
          role="user"
          versionInfo={versionInfo}
          onSwitchVersion={onSwitchVersion}
        />
      );

      const nextButton = screen.getByTitle('Next version');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('edit button', () => {
    it('shows edit button for user messages', () => {
      const onEdit = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="user"
          onEdit={onEdit}
        />
      );

      expect(screen.getByTitle('Edit message')).toBeInTheDocument();
    });

    it('hides edit button for assistant messages', () => {
      const onEdit = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="assistant"
          onEdit={onEdit}
        />
      );

      expect(screen.queryByTitle('Edit message')).not.toBeInTheDocument();
    });

    it('calls onEdit when edit button clicked', () => {
      const onEdit = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="user"
          onEdit={onEdit}
        />
      );

      fireEvent.click(screen.getByTitle('Edit message'));

      expect(onEdit).toHaveBeenCalled();
    });

    it('disables edit button when loading', () => {
      const onEdit = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="user"
          onEdit={onEdit}
          isLoading={true}
        />
      );

      const editButton = screen.getByTitle('Edit message');
      expect(editButton).toBeDisabled();
    });
  });

  describe('regenerate button', () => {
    it('shows regenerate button for assistant messages', () => {
      const onRegenerate = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="assistant"
          onRegenerate={onRegenerate}
        />
      );

      expect(screen.getByTitle('Regenerate response')).toBeInTheDocument();
    });

    it('hides regenerate button for user messages', () => {
      const onRegenerate = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="user"
          onRegenerate={onRegenerate}
        />
      );

      expect(screen.queryByTitle('Regenerate response')).not.toBeInTheDocument();
    });

    it('calls onRegenerate when regenerate button clicked', () => {
      const onRegenerate = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="assistant"
          onRegenerate={onRegenerate}
        />
      );

      fireEvent.click(screen.getByTitle('Regenerate response'));

      expect(onRegenerate).toHaveBeenCalled();
    });

    it('disables regenerate button when loading', () => {
      const onRegenerate = vi.fn();

      render(
        <MessageControls
          messageId="msg_1"
          role="assistant"
          onRegenerate={onRegenerate}
          isLoading={true}
        />
      );

      const regenerateButton = screen.getByTitle('Regenerate response');
      expect(regenerateButton).toBeDisabled();
    });
  });
});
