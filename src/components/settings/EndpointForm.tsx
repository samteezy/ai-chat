'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Endpoint } from '@/lib/db/schema';

interface EndpointFormProps {
  endpoint?: Endpoint | null;
  onCancel?: () => void;
  onSaveComplete?: () => void;
}

export function EndpointForm({ endpoint, onCancel, onSaveComplete }: EndpointFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const isEditMode = !!endpoint;

  useEffect(() => {
    if (endpoint) {
      setName(endpoint.name);
      setBaseUrl(endpoint.baseUrl);
      setApiKey(endpoint.apiKey || '');
      setIsDefault(endpoint.isDefault || false);
      setTestResult(null);
      setTestError(null);
      setError(null);
    } else {
      setName('');
      setBaseUrl('');
      setApiKey('');
      setIsDefault(false);
      setTestResult(null);
      setTestError(null);
      setError(null);
    }
  }, [endpoint]);

  const handleTest = async () => {
    if (!baseUrl) return;

    setTestResult(null);
    setTestError(null);
    try {
      const response = await fetch('/api/endpoints/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey: apiKey || null }),
      });

      const data = await response.json();
      if (data.success) {
        setTestResult('success');
      } else {
        setTestResult('error');
        setTestError(data.error || 'Connection failed');
      }
    } catch {
      setTestResult('error');
      setTestError('Failed to test connection');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/endpoints', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditMode && { id: endpoint.id }),
          name,
          baseUrl,
          apiKey: apiKey || null,
          isDefault,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${isEditMode ? 'update' : 'create'} endpoint`);
      }

      setName('');
      setBaseUrl('');
      setApiKey('');
      setIsDefault(false);
      setTestResult(null);
      router.refresh();
      onSaveComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Local LLM"
          required
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="baseUrl"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Base URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            id="baseUrl"
            value={baseUrl}
            onChange={(e) => {
              setBaseUrl(e.target.value);
              setTestResult(null);
              setTestError(null);
            }}
            placeholder="http://localhost:8080/v1"
            required
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={!baseUrl}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300"
          >
            Test
          </button>
        </div>
        {testResult && (
          <p
            className={`mt-1 text-sm ${
              testResult === 'success' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {testResult === 'success'
              ? 'Connection successful'
              : testError || 'Connection failed'}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="apiKey"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          API Key (optional)
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
        />
        <label
          htmlFor="isDefault"
          className="text-sm text-gray-700 dark:text-gray-300"
        >
          Set as default endpoint
        </label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className={`${onCancel ? 'flex-1' : 'w-full'} px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors`}
        >
          {isLoading
            ? isEditMode
              ? 'Updating...'
              : 'Adding...'
            : isEditMode
              ? 'Update Endpoint'
              : 'Add Endpoint'}
        </button>
      </div>
    </form>
  );
}
