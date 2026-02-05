import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { like, or, desc, eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/chats/search');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || !query.trim()) {
      // Return all chats when no query
      const allChats = await db
        .select()
        .from(chats)
        .orderBy(desc(chats.updatedAt))
        .all();
      return NextResponse.json(allChats);
    }

    const searchTerm = `%${query.trim()}%`;

    // Find chats that match by title
    const chatsByTitle = await db
      .select()
      .from(chats)
      .where(like(chats.title, searchTerm))
      .all();

    // Find chats that have matching message content
    const matchingMessages = await db
      .select({ chatId: messages.chatId })
      .from(messages)
      .where(like(messages.content, searchTerm))
      .all();

    const chatIdsByMessage = [...new Set(matchingMessages.map((m) => m.chatId))];

    // Get chats by message content match (excluding already found by title)
    const titleChatIds = new Set(chatsByTitle.map((c) => c.id));
    const chatIdsToFetch = chatIdsByMessage.filter((id) => !titleChatIds.has(id));

    let chatsByMessage: typeof chatsByTitle = [];
    if (chatIdsToFetch.length > 0) {
      chatsByMessage = await db
        .select()
        .from(chats)
        .where(
          or(...chatIdsToFetch.map((id) => eq(chats.id, id)))
        )
        .all();
    }

    // Combine results, prioritizing title matches, then sort by updatedAt
    const allResults = [...chatsByTitle, ...chatsByMessage].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    return NextResponse.json(allResults);
  } catch (error) {
    logger.error('Failed to search chats', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to search chats' },
      { status: 500 }
    );
  }
}
