'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Log } from '@/lib/db/schema';
import type { LogLevel } from '@/lib/logger';
import { LogEntry } from './LogEntry';
import { LogFilters } from './LogFilters';
import { LogViewerToolbar, type PollInterval } from './LogViewerToolbar';

interface LogsResponse {
  logs: Log[];
  total: number;
  limit: number;
  offset: number;
}

export function LogViewerContent() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
    new Set(['debug', 'info', 'warn', 'error'])
  );
  const [searchText, setSearchText] = useState('');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [pollInterval, setPollInterval] = useState<PollInterval>(3000);
  const [isPurging, setIsPurging] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLevels.size > 0 && selectedLevels.size < 4) {
        params.set('levels', Array.from(selectedLevels).join(','));
      }
      if (searchText) {
        params.set('search', searchText);
      }
      if (selectedSource) {
        params.set('source', selectedSource);
      }
      params.set('limit', '200');

      const res = await fetch(`/api/logs?${params.toString()}`);
      const data: LogsResponse = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevels, searchText, selectedSource]);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [loggingRes, pollRes] = await Promise.all([
          fetch('/api/preferences?key=logSavingEnabled'),
          fetch('/api/preferences?key=logPollInterval'),
        ]);
        const [loggingData, pollData] = await Promise.all([loggingRes.json(), pollRes.json()]);
        setLoggingEnabled(loggingData.value === true);
        if (pollData.value !== null && pollData.value !== undefined) {
          setPollInterval(pollData.value as PollInterval);
        }
      } catch (err) {
        console.error('Failed to load preferences:', err);
      }
    };
    loadPreferences();
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchLogs();

    if (pollInterval === null) return;

    const interval = setInterval(fetchLogs, pollInterval);
    return () => clearInterval(interval);
  }, [fetchLogs, pollInterval]);

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, fetchLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleLoggingEnabledChange = async (enabled: boolean) => {
    setLoggingEnabled(enabled);
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'logSavingEnabled', value: enabled }),
      });
    } catch (err) {
      console.error('Failed to save logging preference:', err);
    }
  };

  const handlePollIntervalChange = async (interval: PollInterval) => {
    setPollInterval(interval);
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'logPollInterval', value: interval }),
      });
    } catch (err) {
      console.error('Failed to save poll interval preference:', err);
    }
  };

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
      setTotal(0);
    } catch (err) {
      console.error('Failed to purge logs:', err);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <LogViewerToolbar
        loggingEnabled={loggingEnabled}
        onLoggingEnabledChange={handleLoggingEnabledChange}
        pollInterval={pollInterval}
        onPollIntervalChange={handlePollIntervalChange}
        onPurge={handlePurge}
        isPurging={isPurging}
      />
      <LogFilters
        selectedLevels={selectedLevels}
        onLevelsChange={setSelectedLevels}
        searchText={searchText}
        onSearchChange={setSearchText}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
      />
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-white dark:bg-gray-900"
      >
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {loggingEnabled ? 'No logs yet.' : 'Logging is disabled. Enable it above to capture logs.'}
          </div>
        ) : (
          logs.map((log) => <LogEntry key={log.id} log={log} />)
        )}
      </div>
      <div className="px-2 py-1 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {total} total logs {!autoScroll && '(Scroll paused - scroll to bottom to resume)'}
      </div>
    </div>
  );
}
