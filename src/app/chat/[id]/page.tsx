import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { chats, messages, endpoints, chatActiveBranch } from '@/lib/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { buildMessageChain, addVersionInfoToChain, findActiveLeaf } from '@/lib/utils/messageTree';

export const dynamic = 'force-dynamic';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  const chat = await db.select().from(chats).where(eq(chats.id, id)).get();

  if (!chat) {
    notFound();
  }

  // Get all messages for the chat
  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.createdAt))
    .all();

  // Get the active branch record
  const activeBranch = await db
    .select()
    .from(chatActiveBranch)
    .where(eq(chatActiveBranch.chatId, id))
    .get();

  // Find the active leaf and build the chain
  const activeLeaf = findActiveLeaf(allMessages, activeBranch?.activeLeafMessageId);

  let chatMessages;
  if (activeLeaf) {
    const chain = buildMessageChain(allMessages, activeLeaf.id);
    chatMessages = addVersionInfoToChain(chain, allMessages);
  } else {
    // Fallback: return all messages if no active leaf found
    chatMessages = addVersionInfoToChain(allMessages, allMessages);
  }

  const allChats = await db
    .select()
    .from(chats)
    .orderBy(desc(chats.updatedAt))
    .all();

  const allEndpoints = await db.select().from(endpoints).all();
  const endpoint = chat.endpointId
    ? allEndpoints.find((e) => e.id === chat.endpointId)
    : allEndpoints.find((e) => e.isDefault) || allEndpoints[0];

  const defaultEndpoint = allEndpoints.find((e) => e.isDefault) || allEndpoints[0];

  return (
    <div className="flex h-screen">
      <ChatSidebar
        chats={allChats}
        endpoints={allEndpoints}
        activeChatId={id}
        defaultEndpointId={defaultEndpoint?.id}
      />

      {/* Chat area */}
      <main className="flex-1 flex flex-col">
        <ChatInterface
          chatId={id}
          endpoint={endpoint || null}
          model={chat.model || ''}
          initialMessages={chatMessages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parts: m.parts as Array<{ type: 'text'; text: string } | { type: 'reasoning'; text: string }> | null,
            versionInfo: m.versionInfo,
          }))}
          endpoints={allEndpoints}
        />
      </main>
    </div>
  );
}
