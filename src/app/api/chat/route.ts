import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openaiClient';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { message?: string };
  const message = body?.message?.trim();

  if (!message) {
    return NextResponse.json({ error: 'Missing message' }, { status: 400 });
  }

  const openai = getOpenAIClient();

  const stream = await openai.responses.stream({
    model: 'gpt-4.1-mini',
    input: message,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'response.output_text.delta') {
            controller.enqueue(encoder.encode(event.delta));
          }
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`\n[stream_error] ${e instanceof Error ? e.message : 'Unknown error'}`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
