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
    const body = (await req.json().catch(() => ({}))) as { topic?: string };
    const topic = String(body.topic ?? '').trim();

    if (!topic) {
      return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
    }

    // Require auth so we can record tool activity.
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = getGitHubModelsClient();
    const completion = await client.chat.completions.create({
      model: process.env.GITHUB_MODELS_MODEL ?? 'openai/gpt-4o',
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content:
            'You generate concise study flashcards. Return ONLY valid JSON. No markdown, no code fences.',
        },
        {
          role: 'user',
          content:
            `Generate 5 flashcards for studying the topic: ${topic}.\nReturn them in JSON format like:\n[\n { "question": "...", "answer": "..." }\n]`,
        },
      ],
      response_format: { type: 'json_object' } as any,
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';

    // The model might return either an array or an object containing an array.
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Model returned invalid JSON', raw }, { status: 502 });
    }

    const cards = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.cards)
        ? parsed.cards
        : Array.isArray(parsed.flashcards)
          ? parsed.flashcards
          : null;

    if (!cards) {
      return NextResponse.json({ error: 'Unexpected JSON shape from model', raw }, { status: 502 });
    }

    const cleaned = cards
      .slice(0, 5)
      .map((c: any) => ({
        question: String(c?.question ?? '').trim(),
        answer: String(c?.answer ?? '').trim(),
      }))
      .filter((c: any) => c.question && c.answer);

    if (!cleaned.length) {
      return NextResponse.json({ error: 'No flashcards generated', raw }, { status: 502 });
    }

    // Record recent tool usage (schema: id, user_id, tool_name, created_at).
    const { error: upsertErr } = await supabase.from('tool_activity').upsert(
      {
        user_id: user.id,
        tool_name: 'flashcards',
      } as any,
      { onConflict: 'user_id,tool_name' as any }
    );
    if (upsertErr) console.error('[api/flashcards] tool_activity upsert error:', upsertErr);

    return NextResponse.json({ topic, cards: cleaned });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/flashcards] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
