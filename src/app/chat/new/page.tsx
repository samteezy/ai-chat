import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { chats, endpoints } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

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
      <ChatSidebar
        chats={allChats}
        endpoints={allEndpoints}
        defaultEndpointId={defaultEndpoint?.id}
      />

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
