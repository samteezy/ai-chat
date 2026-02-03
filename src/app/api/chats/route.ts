import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allChats = await db
      .select()
      .from(chats)
      .orderBy(desc(chats.updatedAt))
      .all();

    return NextResponse.json(allChats);
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }

    // Messages are deleted via cascade
    await db.delete(chats).where(eq(chats.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
}
