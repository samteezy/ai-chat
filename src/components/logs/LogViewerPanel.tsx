'use client';

import { useEffect } from 'react';
import { useLogViewer, type PanelPosition } from './LogViewerContext';
import { LogViewerContent } from './LogViewerContent';

export function LogViewerPanel() {
  const { isOpen, position, closePanel, setPosition } = useLogViewer();

  // Load position preference on mount
  useEffect(() => {
    fetch('/api/preferences?key=logViewerPosition')
      .then((res) => res.json())
      .then((data) => {
        if (data.value === 'bottom' || data.value === 'right') {
          setPosition(data.value as PanelPosition);
        }
      })
      .catch(console.error);
  }, [setPosition]);

  if (!isOpen) return null;

  const positionClasses =
    position === 'bottom'
      ? 'bottom-0 left-0 right-0 h-80 border-t'
      : 'right-0 top-0 bottom-0 w-[500px] border-l';

  return (
    <div
      className={`fixed ${positionClasses} bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-lg z-50 flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
        <h2 className="font-semibold text-gray-900 dark:text-white">Logs</h2>
        <div className="flex items-center gap-2">
          {/* Position toggle */}
          <button
            onClick={() => setPosition(position === 'bottom' ? 'right' : 'bottom')}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title={`Move to ${position === 'bottom' ? 'right' : 'bottom'}`}
          >
            {position === 'bottom' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={closePanel}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <LogViewerContent />
      </div>
    </div>
  );
}
