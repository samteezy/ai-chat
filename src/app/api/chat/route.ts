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
import { eq } from 'drizzle-orm';

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

    // Convert UIMessage format to standard message format for the AI model
    const modelMessages = chatMessages.map((msg: UIMessage) => ({
      role: msg.role,
      content: getMessageContent(msg),
    }));

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
        // Add metrics part for persistence
        parts.push({
          type: 'metrics',
          durationMs,
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
          endpointName: endpoint.name,
          modelName: model,
        });

        // Save assistant message on completion with versioning info
        const assistantMessageId = generateMessageId();
        const assistantVersionGroup = generateVersionGroupId();
        await db.insert(messages).values({
          id: assistantMessageId,
          chatId,
          role: 'assistant',
          content: text,
          parts: parts.length > 0 ? parts : null,
          parentMessageId: userMessageId,
          versionGroup: assistantVersionGroup,
          versionNumber: 1,
          createdAt: new Date(),
        });

        // Update active branch to point to the new assistant message
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
      },
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      headers: {
        'X-Chat-Id': chatId,
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
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
