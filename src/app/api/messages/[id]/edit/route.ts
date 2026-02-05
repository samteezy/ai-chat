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
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/messages/edit');

// Consume stream in background and update message when complete
async function consumeStreamInBackground(
  result: ReturnType<typeof streamText>,
  assistantMessageId: string,
  chatId: string,
  endpointName: string,
  modelName: string | null,
  startTime: number
) {
  try {
    // Consume the full stream - each property is a PromiseLike
    const [text, reasoningText, usage] = await Promise.all([
      result.text,
      result.reasoningText,
      result.usage,
    ]);
    const durationMs = Date.now() - startTime;

    const parts: Array<{
      type: string;
      text?: string;
      durationMs?: number;
      inputTokens?: number;
      outputTokens?: number;
      endpointName?: string;
      modelName?: string;
    }> = [];
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
      endpointName,
      modelName: modelName || undefined,
    });

    await db
      .update(messages)
      .set({
        content: text,
        parts: parts.length > 0 ? parts : null,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(messages.id, assistantMessageId));

    await db
      .insert(chatActiveBranch)
      .values({
        chatId,
        activeLeafMessageId: assistantMessageId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: chatActiveBranch.chatId,
        set: {
          activeLeafMessageId: assistantMessageId,
          updatedAt: new Date(),
        },
      });

    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId));
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during generation';
    await db
      .update(messages)
      .set({
        status: 'failed',
        error: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, assistantMessageId));

    logger.error('Background stream consumption failed', { error: String(error) });
  }
}

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

    // Write-ahead: Create assistant message with 'generating' status BEFORE streaming
    const newAssistantMessageId = generateMessageId();
    const assistantVersionGroup = generateVersionGroupId();
    await db.insert(messages).values({
      id: newAssistantMessageId,
      chatId: originalMessage.chatId,
      role: 'assistant',
      content: '',
      parts: null,
      parentMessageId: newUserMessageId,
      versionGroup: assistantVersionGroup,
      versionNumber: 1,
      status: 'generating',
      createdAt: now,
      updatedAt: now,
    });

    // Stream the new assistant response
    const result = streamText({
      model: wrappedModel,
      messages: modelMessages,
    });

    // Start background consumption - continues even if client disconnects
    consumeStreamInBackground(
      result,
      newAssistantMessageId,
      originalMessage.chatId,
      endpoint.name,
      chat.model,
      startTime
    );

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      headers: {
        'X-User-Message-Id': newUserMessageId,
        'X-Message-Id': newAssistantMessageId,
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
    logger.error('Edit message failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to edit message' },
      { status: 500 }
    );
  }
}
