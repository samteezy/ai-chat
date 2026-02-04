import Link from 'next/link';
import { db } from '@/lib/db';
import { chats, endpoints } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const allChats = await db
    .select()
    .from(chats)
    .orderBy(desc(chats.updatedAt))
    .all();

  const allEndpoints = await db.select().from(endpoints).all();
  const defaultEndpoint = allEndpoints.find((e) => e.isDefault) || allEndpoints[0];

  return (
    <div className="flex h-screen">
      <ChatSidebar
        chats={allChats}
        endpoints={allEndpoints}
        defaultEndpointId={defaultEndpoint?.id}
      />

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg mb-4">Select a chat or start a new conversation</p>
          {allEndpoints.length === 0 && (
            <p className="text-sm">
              <Link href="/settings" className="text-blue-500 hover:underline">
                Add an endpoint
              </Link>{' '}
              to get started
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
