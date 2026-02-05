import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/cleanup/stuck-generations');

// Default timeout for stuck generations: 10 minutes
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const timeoutMs = body.timeoutMs || DEFAULT_TIMEOUT_MS;

    const cutoffTime = new Date(Date.now() - timeoutMs);

    // Find all messages that are stuck in 'generating' status
    const stuckMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.status, 'generating'),
          lt(messages.createdAt, cutoffTime)
        )
      )
      .all();

    // Mark them as failed
    let updatedCount = 0;
    for (const msg of stuckMessages) {
      await db
        .update(messages)
        .set({
          status: 'failed',
          error: 'Generation timed out - the response was not completed',
          updatedAt: new Date(),
        })
        .where(eq(messages.id, msg.id));
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      cleanedUp: updatedCount,
      timeoutMs,
    });
  } catch (error) {
    logger.error('Cleanup stuck generations failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to cleanup stuck generations' },
      { status: 500 }
    );
  }
}
