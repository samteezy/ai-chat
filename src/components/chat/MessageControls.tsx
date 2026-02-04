'use client';

import type { VersionInfo } from '@/types';

interface MessageControlsProps {
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  versionInfo?: VersionInfo;
  isLoading?: boolean;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onSwitchVersion?: (direction: 'prev' | 'next') => void;
}

export function MessageControls({
  messageId,
  role,
  versionInfo,
  isLoading,
  onEdit,
  onRegenerate,
  onSwitchVersion,
}: MessageControlsProps) {
  const hasMultipleVersions = versionInfo && versionInfo.totalVersions > 1;
  const canGoPrev = versionInfo && versionInfo.versionNumber > 1;
  const canGoNext = versionInfo && versionInfo.versionNumber < versionInfo.totalVersions;

  return (
    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
      {/* Version navigation */}
      {hasMultipleVersions && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSwitchVersion?.('prev')}
            disabled={!canGoPrev || isLoading}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous version"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="min-w-[2.5rem] text-center">
            {versionInfo.versionNumber}/{versionInfo.totalVersions}
          </span>
          <button
            onClick={() => onSwitchVersion?.('next')}
            disabled={!canGoNext || isLoading}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next version"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Edit button for user messages */}
      {role === 'user' && onEdit && (
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Edit message"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>
      )}

      {/* Regenerate button for assistant messages */}
      {role === 'assistant' && onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={isLoading}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Regenerate response"
        >
          <svg
            className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
