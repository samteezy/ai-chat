'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Endpoint } from '@/lib/db/schema';

interface EndpointListProps {
  endpoints: Endpoint[];
  onEdit?: (endpoint: Endpoint) => void;
  editingEndpointId?: string;
}

export function EndpointList({ endpoints, onEdit, editingEndpointId }: EndpointListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this endpoint?')) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/endpoints?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete endpoint:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (endpoint: Endpoint) => {
    try {
      await fetch('/api/endpoints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...endpoint,
          isDefault: true,
        }),
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  if (endpoints.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500 dark:text-gray-400">
        No endpoints configured yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {endpoints.map((endpoint) => (
        <div
          key={endpoint.id}
          className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
            editingEndpointId === endpoint.id
              ? 'border-blue-500 ring-1 ring-blue-500'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {endpoint.name}
                </h3>
                {endpoint.isDefault && (
                  <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {endpoint.baseUrl}
              </p>
              {endpoint.apiKey && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  API key configured
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!endpoint.isDefault && (
                <button
                  onClick={() => handleSetDefault(endpoint)}
                  className="text-sm text-blue-500 hover:text-blue-600"
                >
                  Set default
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(endpoint)}
                  disabled={editingEndpointId === endpoint.id}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDelete(endpoint.id)}
                disabled={deletingId === endpoint.id || editingEndpointId === endpoint.id}
                className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
