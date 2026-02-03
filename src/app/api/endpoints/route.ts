import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { endpoints } from '@/lib/db/schema';
import { generateEndpointId } from '@/lib/utils/id';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const allEndpoints = await db.select().from(endpoints).all();
    return NextResponse.json(allEndpoints);
  } catch (error) {
    console.error('Failed to fetch endpoints:', error);
    return NextResponse.json(
      { error: 'Failed to fetch endpoints' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, baseUrl, apiKey, isDefault } = body;

    if (!name || !baseUrl) {
      return NextResponse.json(
        { error: 'Name and baseUrl are required' },
        { status: 400 }
      );
    }

    const now = new Date();

    // If this is set as default, unset other defaults first
    if (isDefault) {
      await db
        .update(endpoints)
        .set({ isDefault: false, updatedAt: now })
        .where(eq(endpoints.isDefault, true));
    }

    const newEndpoint = {
      id: generateEndpointId(),
      name,
      baseUrl,
      apiKey: apiKey || null,
      isDefault: isDefault || false,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(endpoints).values(newEndpoint);

    return NextResponse.json(newEndpoint, { status: 201 });
  } catch (error) {
    console.error('Failed to create endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to create endpoint' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, baseUrl, apiKey, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Endpoint ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();

    // If this is set as default, unset other defaults first
    if (isDefault) {
      await db
        .update(endpoints)
        .set({ isDefault: false, updatedAt: now })
        .where(eq(endpoints.isDefault, true));
    }

    await db
      .update(endpoints)
      .set({
        name,
        baseUrl,
        apiKey: apiKey || null,
        isDefault: isDefault || false,
        updatedAt: now,
      })
      .where(eq(endpoints.id, id));

    const updated = await db
      .select()
      .from(endpoints)
      .where(eq(endpoints.id, id))
      .get();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to update endpoint' },
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
        { error: 'Endpoint ID is required' },
        { status: 400 }
      );
    }

    await db.delete(endpoints).where(eq(endpoints.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to delete endpoint' },
      { status: 500 }
    );
  }
}
