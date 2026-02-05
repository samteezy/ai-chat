import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, chatActiveBranch } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import {
  buildMessageChain,
  addVersionInfoToChain,
  getVersionSiblings,
} from '@/lib/utils/messageTree';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/messages/switch-version');

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const { targetVersionId } = await req.json();

    if (!targetVersionId) {
      return NextResponse.json(
        { error: 'Target version ID is required' },
        { status: 400 }
      );
    }

    // Get the current message
    const currentMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .get();

    if (!currentMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get the target message (the version to switch to)
    const targetMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.id, targetVersionId))
      .get();

    if (!targetMessage) {
      return NextResponse.json(
        { error: 'Target version not found' },
        { status: 404 }
      );
    }

    // Verify they're in the same version group
    if (currentMessage.versionGroup !== targetMessage.versionGroup) {
      return NextResponse.json(
        { error: 'Messages are not versions of each other' },
        { status: 400 }
      );
    }

    // Get all messages for this chat
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, currentMessage.chatId))
      .orderBy(asc(messages.createdAt))
      .all();

    // Find the leaf of the branch starting from targetMessage
    // We need to find the most recent descendant of targetMessage
    const findLeaf = (startId: string): string => {
      // Find direct children of this message
      const children = allMessages.filter((m) => m.parentMessageId === startId);
      if (children.length === 0) {
        return startId;
      }
      // Follow the most recent child's branch
      const mostRecentChild = children.reduce((latest, msg) =>
        msg.createdAt > latest.createdAt ? msg : latest
      );
      return findLeaf(mostRecentChild.id);
    };

    const newLeafId = findLeaf(targetMessage.id);

    // Update active branch
    const now = new Date();
    await db
      .insert(chatActiveBranch)
      .values({
        chatId: currentMessage.chatId,
        activeLeafMessageId: newLeafId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: chatActiveBranch.chatId,
        set: {
          activeLeafMessageId: newLeafId,
          updatedAt: now,
        },
      });

    // Build and return the new message chain with version info
    const chain = buildMessageChain(allMessages, newLeafId);
    const messagesWithVersionInfo = addVersionInfoToChain(chain, allMessages);

    return NextResponse.json({
      messages: messagesWithVersionInfo,
      activeLeafId: newLeafId,
    });
  } catch (error) {
    logger.error('Switch version failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to switch version' },
      { status: 500 }
    );
  }
}
