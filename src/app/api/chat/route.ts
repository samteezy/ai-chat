import {
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
  type UIMessage,
} from 'ai';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints, chats, messages, chatActiveBranch } from '@/lib/db/schema';
import { createProvider } from '@/lib/ai/provider';
import { generateChatId, generateMessageId, generateVersionGroupId } from '@/lib/utils/id';
import { buildMessageChain } from '@/lib/utils/messageTree';
import { eq, asc } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/chat');

// Consume stream in background and update message when complete
// This runs detached from the HTTP response, so it continues even if client disconnects
async function consumeStreamInBackground(
  result: ReturnType<typeof streamText>,
  assistantMessageId: string,
  chatId: string,
  endpointId: string,
  endpointName: string,
  model: string,
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

    // Build parts array for storage
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
      modelName: model,
    });

    // Update assistant message with completed content
    await db
      .update(messages)
      .set({
        content: text,
        parts: parts.length > 0 ? parts : null,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(messages.id, assistantMessageId));

    // Update active branch to point to the assistant message
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

    // Update chat with latest endpoint/model and timestamp
    await db
      .update(chats)
      .set({
        endpointId,
        model,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId));
  } catch (error) {
    // Mark message as failed
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

// Extract text content from UIMessage parts
function getMessageContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      messages: chatMessages,
      endpointId,
      model,
      chatId: existingChatId,
      parentMessageId,
    } = body;

    if (!endpointId || !model) {
      return NextResponse.json(
        { error: 'Endpoint ID and model are required' },
        { status: 400 }
      );
    }

    const endpoint = await db
      .select()
      .from(endpoints)
      .where(eq(endpoints.id, endpointId))
      .get();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    const provider = createProvider(endpoint);
    const now = new Date();

    // Wrap the model with reasoning extraction middleware
    // This extracts <think>...</think> tags into separate reasoning parts
    const wrappedModel = wrapLanguageModel({
      model: provider(model),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });

    // Create or get chat
    let chatId = existingChatId;
    if (!chatId) {
      chatId = generateChatId();
      const firstMessageContent = chatMessages[0] ? getMessageContent(chatMessages[0]) : 'New Chat';
      const title =
        firstMessageContent.length > 50
          ? firstMessageContent.substring(0, 50) + '...'
          : firstMessageContent;

      await db.insert(chats).values({
        id: chatId,
        title,
        endpointId,
        model,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Save user message with versioning info
    const lastUserMessage = chatMessages[chatMessages.length - 1];
    let userMessageId: string | null = null;
    if (lastUserMessage && lastUserMessage.role === 'user') {
      userMessageId = generateMessageId();
      const userVersionGroup = generateVersionGroupId();
      await db.insert(messages).values({
        id: userMessageId,
        chatId,
        role: 'user',
        content: getMessageContent(lastUserMessage),
        parentMessageId: parentMessageId || null,
        versionGroup: userVersionGroup,
        versionNumber: 1,
        createdAt: now,
      });
    }

    // Build the message context for the AI model
    // When parentMessageId is provided, build from database to ensure correct version chain
    // This prevents stale client state from sending wrong message history
    type MessageRole = 'user' | 'assistant' | 'system';
    let modelMessages: Array<{ role: MessageRole; content: string }>;

    if (parentMessageId && existingChatId) {
      // Build chain from database using parent message
      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.chatId, existingChatId))
        .orderBy(asc(messages.createdAt))
        .all();

      const conversationChain = buildMessageChain(allMessages, parentMessageId);
      modelMessages = [
        ...conversationChain.map((msg) => ({
          role: msg.role as MessageRole,
          content: msg.content,
        })),
        // Add the new user message from the client
        {
          role: 'user' as const,
          content: chatMessages.length > 0
            ? getMessageContent(chatMessages[chatMessages.length - 1])
            : '',
        },
      ];
    } else {
      // For new chats or when no parent is specified, use client messages
      modelMessages = chatMessages.map((msg: UIMessage) => ({
        role: msg.role as MessageRole,
        content: getMessageContent(msg),
      }));
    }

    // Write-ahead: Create assistant message with 'generating' status BEFORE streaming
    const assistantMessageId = generateMessageId();
    const assistantVersionGroup = generateVersionGroupId();
    await db.insert(messages).values({
      id: assistantMessageId,
      chatId,
      role: 'assistant',
      content: '',
      parts: null,
      parentMessageId: userMessageId,
      versionGroup: assistantVersionGroup,
      versionNumber: 1,
      status: 'generating',
      createdAt: now,
      updatedAt: now,
    });

    const result = streamText({
      model: wrappedModel,
      messages: modelMessages,
    });

    // Start background consumption - this continues even if client disconnects
    // We don't await this promise - it runs detached
    consumeStreamInBackground(
      result,
      assistantMessageId,
      chatId,
      endpointId,
      endpoint.name,
      model,
      startTime
    );

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      headers: {
        'X-Chat-Id': chatId,
        'X-Message-Id': assistantMessageId,
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
            modelName: model,
          };
        }
        return undefined;
      },
    });
  } catch (error) {
    logger.error('Chat request failed', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
