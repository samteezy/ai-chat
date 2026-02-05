import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logs } from '@/lib/db/schema';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/logs/sources');

export async function GET() {
  try {
    const sources = await db
      .selectDistinct({ source: logs.source })
      .from(logs)
      .orderBy(logs.source)
      .all();

    return NextResponse.json(sources.map((s) => s.source));
  } catch (error) {
    logger.error('Failed to fetch log sources', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch log sources' },
      { status: 500 }
    );
  }
}
