'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Chat } from '@/lib/db/schema';

interface ChatListProps {
  chats: Chat[];
  activeChatId?: string;
}

export function ChatList({ chats, activeChatId }: ChatListProps) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Delete this chat?')) return;

    try {
      const response = await fetch(`/api/chats?id=${chatId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (activeChatId === chatId) {
          router.push('/');
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  if (chats.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
        No chats yet
      </div>
    );
  }

  return (
    <nav className="space-y-1 p-2">
      {chats.map((chat) => (
        <Link
          key={chat.id}
          href={`/chat/${chat.id}`}
          className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
            activeChatId === chat.id
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span className="truncate flex-1">{chat.title}</span>
          <button
            onClick={(e) => handleDelete(e, chat.id)}
            className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-gray-400 hover:text-red-500 transition-opacity"
            title="Delete chat"
          >
            <svg
              className="w-4 h-4"
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
        </Link>
      ))}
    </nav>
  );
}
