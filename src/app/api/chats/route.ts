import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

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
    const ids = searchParams.get('ids');

    // Support bulk delete with ?ids=id1,id2,id3
    if (searchParams.has('ids')) {
      const idArray = ids ? ids.split(',').filter(Boolean) : [];
      if (idArray.length === 0) {
        return NextResponse.json(
          { error: 'At least one chat ID is required' },
          { status: 400 }
        );
      }

      // Messages are deleted via cascade
      await db.delete(chats).where(inArray(chats.id, idArray));

      return NextResponse.json({ success: true, deleted: idArray.length });
    }

    // Single delete with ?id=xxx
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
