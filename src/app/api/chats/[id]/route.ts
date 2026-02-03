import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

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

    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, id))
      .orderBy(asc(messages.createdAt))
      .all();

    return NextResponse.json({
      ...chat,
      messages: chatMessages,
    });
  } catch (error) {
    console.error('Failed to fetch chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}
