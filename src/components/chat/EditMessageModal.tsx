'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface EditMessageModalProps {
  isOpen: boolean;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function EditMessageModal({
  isOpen,
  initialContent,
  onSave,
  onCancel,
}: EditMessageModalProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset content when modal opens with new content
  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      // Focus and select all text
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 0);
    }
  }, [isOpen, initialContent]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (content.trim()) {
          onSave(content.trim());
        }
      }
    },
    [content, onCancel, onSave]
  );

  // Handle clicking outside the modal
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Message
          </h2>
        </div>

        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-48 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your message..."
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Press Ctrl+Enter to save, Escape to cancel
          </p>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => content.trim() && onSave(content.trim())}
            disabled={!content.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save & Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
