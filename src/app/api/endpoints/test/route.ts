import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { baseUrl, apiKey } = await req.json();

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Base URL is required' },
        { status: 400 }
      );
    }

    // Normalize baseUrl by removing trailing slash
    const normalizedUrl = baseUrl.replace(/\/+$/, '');
    const url = `${normalizedUrl}/models`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        {
          success: false,
          error: `${response.status} ${response.statusText}${text ? `: ${text}` : ''}`
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    const modelCount = Array.isArray(data.data) ? data.data.length : 0;

    return NextResponse.json({
      success: true,
      modelCount
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 200 }
    );
  }
}
