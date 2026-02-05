import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints } from '@/lib/db/schema';
import { fetchModels } from '@/lib/ai/models';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api/models');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const endpointId = searchParams.get('endpointId');

    if (!endpointId) {
      return NextResponse.json(
        { error: 'Endpoint ID is required' },
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

    const models = await fetchModels(endpoint);

    return NextResponse.json(models);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to fetch models', { error: message });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
