import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

function getGitHubModelsClient() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Missing GITHUB_TOKEN');

  return new OpenAI({
    baseURL: 'https://models.github.ai/inference',
    apiKey: token,
  });
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as null | {
      message?: string;
      conversationId?: string;
    };

    const message = body?.message?.trim();
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // conversationId is accepted for client bookkeeping; not required for inference
    void body?.conversationId;

    const client = getGitHubModelsClient();

    const stream = await client.chat.completions.create({
      model: process.env.GITHUB_MODELS_MODEL ?? 'openai/gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI study assistant. Be concise, correct, and explain step-by-step when helpful.',
        },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/chat] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
