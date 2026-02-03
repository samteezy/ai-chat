'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Endpoint } from '@/lib/db/schema';
import type { Model } from '@/lib/ai/models';

interface NewChatButtonProps {
  endpoints: Endpoint[];
  defaultEndpointId?: string;
}

export function NewChatButton({ endpoints, defaultEndpointId }: NewChatButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    defaultEndpointId || ''
  );
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const fetchModelsForEndpoint = useCallback(async (endpointId: string) => {
    if (!endpointId) {
      setModels([]);
      return;
    }

    setIsLoadingModels(true);
    try {
      const response = await fetch(`/api/models?endpointId=${endpointId}`);
      if (response.ok) {
        const data = await response.json();
        setModels(data);
        if (data.length > 0) {
          setSelectedModel(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Fetch models when popup opens with a default endpoint
  useEffect(() => {
    if (isOpen && selectedEndpoint && models.length === 0) {
      fetchModelsForEndpoint(selectedEndpoint);
    }
  }, [isOpen, selectedEndpoint, models.length, fetchModelsForEndpoint]);

  const handleEndpointChange = (endpointId: string) => {
    setSelectedEndpoint(endpointId);
    setSelectedModel('');
    setModels([]);
    fetchModelsForEndpoint(endpointId);
  };

  const handleCreate = () => {
    if (!selectedEndpoint || !selectedModel) return;

    // Navigate to a new chat page with query params
    const params = new URLSearchParams({
      endpoint: selectedEndpoint,
      model: selectedModel,
    });
    router.push(`/chat/new?${params}`);
    setIsOpen(false);
  };

  if (endpoints.length === 0) {
    return (
      <button
        onClick={() => router.push('/settings')}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Endpoint
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        New Chat
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-10">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endpoint
              </label>
              <select
                value={selectedEndpoint}
                onChange={(e) => handleEndpointChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="">Select endpoint...</option>
                {endpoints.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!selectedEndpoint || isLoadingModels}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="">
                  {isLoadingModels ? 'Loading...' : 'Select model...'}
                </option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedEndpoint || !selectedModel}
                className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
