import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints } from '@/lib/db/schema';
import { fetchModels } from '@/lib/ai/models';
import { eq } from 'drizzle-orm';

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
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models from endpoint' },
      { status: 500 }
    );
  }
}
