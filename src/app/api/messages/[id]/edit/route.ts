import {
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, chats, endpoints, chatActiveBranch } from '@/lib/db/schema';
import { createProvider } from '@/lib/ai/provider';
import { generateMessageId, generateVersionGroupId } from '@/lib/utils/id';
import { buildMessageChain, getNextVersionNumber } from '@/lib/utils/messageTree';
import { eq } from 'drizzle-orm';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id: messageId } = await params;
    const { content: newContent } = await req.json();

    if (!newContent || typeof newContent !== 'string') {
      return NextResponse.json(
        { error: 'New content is required' },
        { status: 400 }
      );
    }

    // Get the original message
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

    if (originalMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Can only edit user messages' },
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

    // Get all messages for version calculation
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, originalMessage.chatId))
      .all();

    // Calculate next version number for this version group
    const nextVersionNumber = originalMessage.versionGroup
      ? getNextVersionNumber(allMessages, originalMessage.versionGroup)
      : 1;

    // Create new user message with the edited content
    const now = new Date();
    const newUserMessageId = generateMessageId();
    await db.insert(messages).values({
      id: newUserMessageId,
      chatId: originalMessage.chatId,
      role: 'user',
      content: newContent,
      parentMessageId: originalMessage.parentMessageId,
      versionGroup: originalMessage.versionGroup || generateVersionGroupId(),
      versionNumber: nextVersionNumber,
      createdAt: now,
    });

    // Build conversation history up to (and including) the new user message
    const conversationChain = buildMessageChain(allMessages, originalMessage.parentMessageId || '');
    const modelMessages = [
      ...conversationChain.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      { role: 'user' as const, content: newContent },
    ];

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

        // Save new assistant message
        const newAssistantMessageId = generateMessageId();
        const assistantVersionGroup = generateVersionGroupId();
        await db.insert(messages).values({
          id: newAssistantMessageId,
          chatId: originalMessage.chatId,
          role: 'assistant',
          content: text,
          parts: parts.length > 0 ? parts : null,
          parentMessageId: newUserMessageId,
          versionGroup: assistantVersionGroup,
          versionNumber: 1,
          createdAt: new Date(),
        });

        // Update active branch
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
        'X-User-Message-Id': newUserMessageId,
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
    console.error('Edit message error:', error);
    return NextResponse.json(
      { error: 'Failed to edit message' },
      { status: 500 }
    );
  }
}
