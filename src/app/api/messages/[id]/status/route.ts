import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/messages/status');

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;

    const message = await db
      .select({
        id: messages.id,
        status: messages.status,
        content: messages.content,
        error: messages.error,
        updatedAt: messages.updatedAt,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .get();

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: message.id,
      status: message.status || 'completed',
      content: message.content,
      error: message.error,
      updatedAt: message.updatedAt?.getTime() || null,
    });
  } catch (error) {
    logger.error('Get message status failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to get message status' },
      { status: 500 }
    );
  }
}
