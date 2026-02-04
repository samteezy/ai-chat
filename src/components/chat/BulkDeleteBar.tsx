'use client';

interface BulkDeleteBarProps {
  selectedCount: number;
  onCancel: () => void;
  onDelete: () => void;
}

export function BulkDeleteBar({ selectedCount, onCancel, onDelete }: BulkDeleteBarProps) {
  const handleDelete = () => {
    if (confirm(`Delete ${selectedCount} chat${selectedCount !== 1 ? 's' : ''}?`)) {
      onDelete();
    }
  };

  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-blue-700 dark:text-blue-300">
          {selectedCount} chat{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
