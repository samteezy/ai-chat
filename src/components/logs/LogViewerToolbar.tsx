'use client';

import { useState } from 'react';

export type PollInterval = 1000 | 3000 | 5000 | 10000 | null;

interface LogViewerToolbarProps {
  loggingEnabled: boolean;
  onLoggingEnabledChange: (enabled: boolean) => void;
  pollInterval: PollInterval;
  onPollIntervalChange: (interval: PollInterval) => void;
  onPurge: () => void;
  isPurging: boolean;
}

const intervalOptions: { value: PollInterval; label: string }[] = [
  { value: 1000, label: '1s' },
  { value: 3000, label: '3s' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: null, label: 'Paused' },
];

export function LogViewerToolbar({
  loggingEnabled,
  onLoggingEnabledChange,
  pollInterval,
  onPollIntervalChange,
  onPurge,
  isPurging,
}: LogViewerToolbarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePurgeClick = () => {
    if (showConfirm) {
      onPurge();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      // Auto-hide confirm after 3 seconds
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div className="flex items-center gap-4 p-2 border-b border-gray-200 dark:border-gray-700">
      {/* Enable Logging Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="text-sm text-gray-600 dark:text-gray-400">Enable Logging</span>
        <button
          role="switch"
          aria-checked={loggingEnabled}
          onClick={() => onLoggingEnabledChange(!loggingEnabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            loggingEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              loggingEnabled ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {/* Poll Interval Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">Poll:</span>
        <select
          value={pollInterval === null ? 'paused' : pollInterval.toString()}
          onChange={(e) => {
            const val = e.target.value;
            onPollIntervalChange(val === 'paused' ? null : (parseInt(val, 10) as PollInterval));
          }}
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {intervalOptions.map((opt) => (
            <option key={opt.label} value={opt.value === null ? 'paused' : opt.value.toString()}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Purge Button */}
      <button
        onClick={handlePurgeClick}
        disabled={isPurging}
        className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
          showConfirm
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        } disabled:opacity-50`}
      >
        {isPurging ? 'Purging...' : showConfirm ? 'Confirm Purge' : 'Purge Logs'}
      </button>
    </div>
  );
}
