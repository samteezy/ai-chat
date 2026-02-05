'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Chat, Endpoint } from '@/lib/db/schema';
import { ChatList } from './ChatList';
import { NewChatButton } from './NewChatButton';
import { BulkDeleteBar } from './BulkDeleteBar';
import { LogViewerToggle } from '@/components/logs';

interface ChatSidebarProps {
  chats: Chat[];
  endpoints: Endpoint[];
  activeChatId?: string;
  defaultEndpointId?: string;
}

export function ChatSidebar({
  chats,
  endpoints,
  activeChatId,
  defaultEndpointId,
}: ChatSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Chat[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search with debouncing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/chats/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (response.ok) {
          const results = await response.json();
          // Convert date strings back to Date objects
          const parsedResults = results.map((chat: Chat & { createdAt: string; updatedAt: string }) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
          }));
          setSearchResults(parsedResults);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Use search results if available, otherwise use initial chats
  const displayedChats = searchResults !== null ? searchResults : chats;

  const isSelectionMode = selectedIds.size > 0;

  const handleChatClick = useCallback(
    (e: React.MouseEvent, chatId: string) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      if (isCtrlOrCmd) {
        e.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(chatId)) {
            next.delete(chatId);
          } else {
            next.add(chatId);
          }
          return next;
        });
        setLastSelectedId(chatId);
      } else if (isShift && lastSelectedId) {
        e.preventDefault();
        const chatIds = displayedChats.map((c) => c.id);
        const lastIndex = chatIds.indexOf(lastSelectedId);
        const currentIndex = chatIds.indexOf(chatId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = chatIds.slice(start, end + 1);

          setSelectedIds((prev) => {
            const next = new Set(prev);
            rangeIds.forEach((id) => next.add(id));
            return next;
          });
        }
      } else if (isSelectionMode) {
        e.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(chatId)) {
            next.delete(chatId);
          } else {
            next.add(chatId);
          }
          return next;
        });
        setLastSelectedId(chatId);
      }
      // If no modifier and not in selection mode, let the default navigation happen
    },
    [displayedChats, lastSelectedId, isSelectionMode]
  );

  const handleToggleSelect = useCallback((chatId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
    setLastSelectedId(chatId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);
    const deletingActiveChat = activeChatId && selectedIds.has(activeChatId);

    try {
      const response = await fetch(`/api/chats?ids=${idsToDelete.join(',')}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        clearSelection();
        if (deletingActiveChat) {
          router.push('/');
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Failed to delete chats:', error);
    }
  }, [selectedIds, activeChatId, clearSelection, router]);

  // Handle Escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, clearSelection]);

  return (
    <aside className="w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
          AI Chat
        </Link>
      </div>

      <div className="p-4">
        <NewChatButton endpoints={endpoints} defaultEndpointId={defaultEndpointId} />
      </div>

      {/* Search input */}
      <div className="px-4 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats and messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Clear search"
            >
              {isSearching ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} strokeDasharray="32" strokeDashoffset="12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ChatList
          chats={displayedChats}
          activeChatId={activeChatId}
          selectedIds={selectedIds}
          isSelectionMode={isSelectionMode}
          onChatClick={handleChatClick}
          onToggleSelect={handleToggleSelect}
        />
      </div>

      {isSelectionMode && (
        <BulkDeleteBar
          selectedCount={selectedIds.size}
          onCancel={clearSelection}
          onDelete={handleBulkDelete}
        />
      )}

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <LogViewerToggle />
        <Link
          href="/settings"
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </Link>
      </div>
    </aside>
  );
}
