'use client';

import { useState, useEffect } from 'react';
import type { LogLevel } from '@/lib/logger';

interface LogFiltersProps {
  selectedLevels: Set<LogLevel>;
  onLevelsChange: (levels: Set<LogLevel>) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  selectedSource: string | null;
  onSourceChange: (source: string | null) => void;
}

const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

const levelColors: Record<LogLevel, string> = {
  debug: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200',
  info: 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
  warn: 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200',
  error: 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200',
};

const levelColorsActive: Record<LogLevel, string> = {
  debug: 'bg-gray-500 text-white',
  info: 'bg-blue-500 text-white',
  warn: 'bg-yellow-500 text-white',
  error: 'bg-red-500 text-white',
};

export function LogFilters({
  selectedLevels,
  onLevelsChange,
  searchText,
  onSearchChange,
  selectedSource,
  onSourceChange,
}: LogFiltersProps) {
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/logs/sources')
      .then((res) => res.json())
      .then((data) => setSources(data))
      .catch(console.error);
  }, []);

  const toggleLevel = (level: LogLevel) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    onLevelsChange(newLevels);
  };

  return (
    <div className="flex items-center gap-3 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Level toggles */}
      <div className="flex gap-1">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => toggleLevel(level)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              selectedLevels.has(level) ? levelColorsActive[level] : levelColors[level]
            }`}
            title={`Toggle ${level} logs`}
          >
            {level.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Source dropdown */}
      <select
        value={selectedSource || ''}
        onChange={(e) => onSourceChange(e.target.value || null)}
        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All sources</option>
        {sources.map((source) => (
          <option key={source} value={source}>
            {source}
          </option>
        ))}
      </select>
    </div>
  );
}
