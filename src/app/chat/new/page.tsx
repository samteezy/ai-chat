import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { chats, endpoints } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatList } from '@/components/chat/ChatList';
import { NewChatButton } from '@/components/chat/NewChatButton';

export const dynamic = 'force-dynamic';

interface NewChatPageProps {
  searchParams: Promise<{ endpoint?: string; model?: string }>;
}

export default async function NewChatPage({ searchParams }: NewChatPageProps) {
  const { endpoint: endpointId, model } = await searchParams;

  const allEndpoints = await db.select().from(endpoints).all();
  const allChats = await db
    .select()
    .from(chats)
    .orderBy(desc(chats.updatedAt))
    .all();

  const selectedEndpoint = endpointId
    ? allEndpoints.find((e) => e.id === endpointId)
    : allEndpoints.find((e) => e.isDefault) || allEndpoints[0];

  const defaultEndpoint = allEndpoints.find((e) => e.isDefault) || allEndpoints[0];

  if (!selectedEndpoint) {
    redirect('/settings');
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
            AI Chat
          </Link>
        </div>

        <div className="p-4">
          <NewChatButton
            endpoints={allEndpoints}
            defaultEndpointId={defaultEndpoint?.id}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChatList chats={allChats} />
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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

      {/* Chat area */}
      <main className="flex-1 flex flex-col">
        <ChatInterface
          chatId=""
          endpoint={selectedEndpoint}
          model={model || ''}
          initialMessages={[]}
          endpoints={allEndpoints}
        />
      </main>
    </div>
  );
}
