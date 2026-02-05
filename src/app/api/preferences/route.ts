import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/preferences');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    const pref = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.key, key))
      .get();

    if (!pref) {
      return NextResponse.json({ key, value: null });
    }

    return NextResponse.json({ key: pref.key, value: pref.value });
  } catch (error) {
    logger.error('Failed to fetch preference', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch preference' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      );
    }

    const now = new Date();

    await db
      .insert(userPreferences)
      .values({
        key,
        value,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userPreferences.key,
        set: {
          value,
          updatedAt: now,
        },
      });

    return NextResponse.json({ key, value });
  } catch (error) {
    logger.error('Failed to save preference', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to save preference' },
      { status: 500 }
    );
  }
}
