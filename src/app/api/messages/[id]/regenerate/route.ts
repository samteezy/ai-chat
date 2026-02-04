import {
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, chats, endpoints, chatActiveBranch } from '@/lib/db/schema';
import { createProvider } from '@/lib/ai/provider';
import { generateMessageId } from '@/lib/utils/id';
import { buildMessageChain, getNextVersionNumber } from '@/lib/utils/messageTree';
import { eq } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id: messageId } = await params;

    // Get the original assistant message
    const originalMessage = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .get();

    if (!originalMessage) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    if (originalMessage.role !== 'assistant') {
      return NextResponse.json(
        { error: 'Can only regenerate assistant messages' },
        { status: 400 }
      );
    }

    // Get the chat and its settings
    const chat = await db
      .select()
      .from(chats)
      .where(eq(chats.id, originalMessage.chatId))
      .get();

    if (!chat || !chat.endpointId || !chat.model) {
      return NextResponse.json(
        { error: 'Chat configuration not found' },
        { status: 404 }
      );
    }

    // Get the endpoint
    const endpoint = await db
      .select()
      .from(endpoints)
      .where(eq(endpoints.id, chat.endpointId))
      .get();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    // Get all messages for version calculation and conversation history
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, originalMessage.chatId))
      .all();

    // Calculate next version number for this assistant's version group
    const nextVersionNumber = originalMessage.versionGroup
      ? getNextVersionNumber(allMessages, originalMessage.versionGroup)
      : 1;

    // Build conversation history up to (but not including) the original assistant message
    // The parentMessageId of the assistant message is the user message we want to include
    const conversationChain = originalMessage.parentMessageId
      ? buildMessageChain(allMessages, originalMessage.parentMessageId)
      : [];

    const modelMessages = conversationChain.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Create provider and wrapped model
    const provider = createProvider(endpoint);
    const wrappedModel = wrapLanguageModel({
      model: provider(chat.model),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });

    // Stream the new assistant response
    const result = streamText({
      model: wrappedModel,
      messages: modelMessages,
      onFinish: async ({ text, reasoningText, usage }) => {
        const durationMs = Date.now() - startTime;

        // Build parts array for storage
        const parts: Array<{ type: string; text?: string; durationMs?: number; inputTokens?: number; outputTokens?: number; endpointName?: string; modelName?: string }> = [];
        if (reasoningText) {
          parts.push({ type: 'reasoning', text: reasoningText });
        }
        if (text) {
          parts.push({ type: 'text', text });
        }
        parts.push({
          type: 'metrics',
          durationMs,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          endpointName: endpoint.name,
          modelName: chat.model || undefined,
        });

        // Save new assistant message as a new version
        const newAssistantMessageId = generateMessageId();
        await db.insert(messages).values({
          id: newAssistantMessageId,
          chatId: originalMessage.chatId,
          role: 'assistant',
          content: text,
          parts: parts.length > 0 ? parts : null,
          parentMessageId: originalMessage.parentMessageId,
          versionGroup: originalMessage.versionGroup,
          versionNumber: nextVersionNumber,
          createdAt: new Date(),
        });

        // Update active branch to point to the new message
        await db
          .insert(chatActiveBranch)
          .values({
            chatId: originalMessage.chatId,
            activeLeafMessageId: newAssistantMessageId,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: chatActiveBranch.chatId,
            set: {
              activeLeafMessageId: newAssistantMessageId,
              updatedAt: new Date(),
            },
          });

        // Update chat timestamp
        await db
          .update(chats)
          .set({ updatedAt: new Date() })
          .where(eq(chats.id, originalMessage.chatId));
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      headers: {
        'X-Original-Message-Id': messageId,
      },
      messageMetadata: ({ part }) => {
        if (part.type === 'start') {
          return { createdAt: Date.now() };
        }
        if (part.type === 'finish') {
          return {
            durationMs: Date.now() - startTime,
            inputTokens: part.totalUsage?.inputTokens,
            outputTokens: part.totalUsage?.outputTokens,
            endpointName: endpoint.name,
            modelName: chat.model || undefined,
          };
        }
        return undefined;
      },
    });
  } catch (error) {
    console.error('Regenerate message error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate message' },
      { status: 500 }
    );
  }
}
