import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logs } from '@/lib/db/schema';
import { desc, eq, like, inArray, and, sql } from 'drizzle-orm';
import { createLogger, type LogLevel } from '@/lib/logger';

const logger = createLogger('api/logs');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const levels = searchParams.get('levels')?.split(',').filter(Boolean) as LogLevel[] | undefined;
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const conditions = [];

    if (levels && levels.length > 0) {
      conditions.push(inArray(logs.level, levels));
    }

    if (search) {
      conditions.push(like(logs.message, `%${search}%`));
    }

    if (source) {
      conditions.push(eq(logs.source, source));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [logEntries, countResult] = await Promise.all([
      db
        .select()
        .from(logs)
        .where(whereClause)
        .orderBy(desc(logs.createdAt))
        .limit(limit)
        .offset(offset)
        .all(),
      db
        .select({ count: sql<number>`count(*)` })
        .from(logs)
        .where(whereClause)
        .get(),
    ]);

    return NextResponse.json({
      logs: logEntries,
      total: countResult?.count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch logs', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await db.delete(logs).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to purge logs', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to purge logs' },
      { status: 500 }
    );
  }
}
