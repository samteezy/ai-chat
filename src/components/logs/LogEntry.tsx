'use client';

import { useState } from 'react';
import type { Log } from '@/lib/db/schema';

interface LogEntryProps {
  log: Log;
}

const levelColors: Record<string, string> = {
  debug: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
  info: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  warn: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  error: 'text-red-600 bg-red-100 dark:bg-red-900/30',
};

export function LogEntry({ log }: LogEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const context = log.context as Record<string, unknown> | null;
  const hasContext = context !== null && Object.keys(context).length > 0;

  const timestamp = new Date(log.createdAt).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-xs font-mono">
      <div className="flex items-start gap-2">
        <span className="text-gray-400 shrink-0">{timestamp}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${levelColors[log.level]}`}
        >
          {log.level}
        </span>
        <span className="text-purple-600 dark:text-purple-400 shrink-0">[{log.source}]</span>
        {log.requestId && (
          <span className="text-gray-400 shrink-0">[{log.requestId.slice(0, 8)}]</span>
        )}
        <span className="text-gray-900 dark:text-gray-100 flex-1 break-all">{log.message}</span>
        {hasContext && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
            title={isExpanded ? 'Collapse' : 'Expand context'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {isExpanded && hasContext && (
        <div className="mt-1 ml-[200px] p-2 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 overflow-x-auto">
          <pre className="whitespace-pre-wrap">{JSON.stringify(context, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
