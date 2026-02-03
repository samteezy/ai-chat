'use client';

import { useState } from 'react';
import type { Endpoint } from '@/lib/db/schema';
import { EndpointForm } from './EndpointForm';
import { EndpointList } from './EndpointList';

interface EndpointSettingsProps {
  endpoints: Endpoint[];
}

export function EndpointSettings({ endpoints }: EndpointSettingsProps) {
  const [editingEndpoint, setEditingEndpoint] = useState<Endpoint | null>(null);

  const handleEdit = (endpoint: Endpoint) => {
    setEditingEndpoint(endpoint);
  };

  const handleCancel = () => {
    setEditingEndpoint(null);
  };

  const handleSaveComplete = () => {
    setEditingEndpoint(null);
  };

  return (
    <>
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editingEndpoint ? 'Edit Endpoint' : 'Add Endpoint'}
        </h2>
        <EndpointForm
          endpoint={editingEndpoint}
          onCancel={editingEndpoint ? handleCancel : undefined}
          onSaveComplete={handleSaveComplete}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Saved Endpoints
        </h2>
        <EndpointList
          endpoints={endpoints}
          onEdit={handleEdit}
          editingEndpointId={editingEndpoint?.id}
        />
      </section>
    </>
  );
}
