import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints, chats, messages } from '@/lib/db/schema';
import { createProvider } from '@/lib/ai/provider';
import { generateChatId, generateMessageId } from '@/lib/utils/id';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      messages: chatMessages,
      endpointId,
      model,
      chatId: existingChatId,
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

    // Create or get chat
    let chatId = existingChatId;
    if (!chatId) {
      chatId = generateChatId();
      const firstMessage = chatMessages[0]?.content || 'New Chat';
      const title =
        firstMessage.length > 50
          ? firstMessage.substring(0, 50) + '...'
          : firstMessage;

      await db.insert(chats).values({
        id: chatId,
        title,
        endpointId,
        model,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Save user message
    const lastUserMessage = chatMessages[chatMessages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      await db.insert(messages).values({
        id: generateMessageId(),
        chatId,
        role: 'user',
        content: lastUserMessage.content,
        createdAt: now,
      });
    }

    const result = streamText({
      model: provider(model),
      messages: chatMessages,
      onFinish: async ({ text }) => {
        // Save assistant message on completion
        await db.insert(messages).values({
          id: generateMessageId(),
          chatId,
          role: 'assistant',
          content: text,
          createdAt: new Date(),
        });

        // Update chat timestamp
        await db
          .update(chats)
          .set({ updatedAt: new Date() })
          .where(eq(chats.id, chatId));
      },
    });

    return result.toUIMessageStreamResponse({
      headers: {
        'X-Chat-Id': chatId,
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
