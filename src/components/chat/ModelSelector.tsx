'use client';

import { useState, useEffect } from 'react';
import type { Endpoint } from '@/lib/db/schema';
import type { Model } from '@/lib/ai/models';

interface ModelSelectorProps {
  endpoints: Endpoint[];
  selectedEndpoint: Endpoint | null;
  selectedModel: string;
  onEndpointChange: (endpoint: Endpoint | null) => void;
  onModelChange: (model: string) => void;
}

export function ModelSelector({
  endpoints,
  selectedEndpoint,
  selectedModel,
  onEndpointChange,
  onModelChange,
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEndpoint) {
      setModels([]);
      return;
    }

    const fetchModels = async () => {
      setIsLoadingModels(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/models?endpointId=${selectedEndpoint.id}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        setModels(data);

        // Auto-select first model if none selected
        if (data.length > 0 && !selectedModel) {
          onModelChange(data[0].id);
        }
      } catch (err) {
        setError('Failed to load models');
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [selectedEndpoint, selectedModel, onModelChange]);

  const handleEndpointChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const endpoint = endpoints.find((ep) => ep.id === e.target.value) || null;
    onEndpointChange(endpoint);
    onModelChange('');
  };

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex-1 min-w-[200px]">
        <label
          htmlFor="endpoint"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Endpoint
        </label>
        <select
          id="endpoint"
          value={selectedEndpoint?.id || ''}
          onChange={handleEndpointChange}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select endpoint...</option>
          {endpoints.map((endpoint) => (
            <option key={endpoint.id} value={endpoint.id}>
              {endpoint.name}
              {endpoint.isDefault ? ' (default)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label
          htmlFor="model"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Model
        </label>
        <select
          id="model"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={!selectedEndpoint || isLoadingModels}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">
            {isLoadingModels
              ? 'Loading models...'
              : !selectedEndpoint
              ? 'Select endpoint first'
              : 'Select model...'}
          </option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.id}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
}
