import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages, chatActiveBranch } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { buildMessageChain, addVersionInfoToChain, findActiveLeaf } from '@/lib/utils/messageTree';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/chats/[id]');

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const chat = await db
      .select()
      .from(chats)
      .where(eq(chats.id, id))
      .get();

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
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

    return NextResponse.json({
      ...chat,
      messages: chatMessages,
    });
  } catch (error) {
    logger.error('Failed to fetch chat', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}
