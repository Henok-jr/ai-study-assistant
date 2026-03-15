import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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
    const body = (await req.json().catch(() => ({}))) as { text?: string };
    const text = String(body.text ?? '').trim();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const client = getGitHubModelsClient();
    const completion = await client.chat.completions.create({
      model: process.env.GITHUB_MODELS_MODEL ?? 'openai/gpt-4o',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You convert lecture notes/topics into structured study notes. Use clear headings and bullet points. Keep it concise and accurate.',
        },
        {
          role: 'user',
          content:
            `Convert the following topic into structured study notes with headings and bullet points.\n\n${text}`,
        },
      ],
    });

    const notes = (completion.choices?.[0]?.message?.content ?? '').trim();
    if (!notes) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 });
    }

    return NextResponse.json({ notes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/notes] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
