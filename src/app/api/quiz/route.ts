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

type Difficulty = 'easy' | 'medium' | 'hard';

type QuizQ = { question: string; choices: string[]; answerIndex: number };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { topic?: string; difficulty?: string };
    const topic = String(body.topic ?? '').trim();
    const difficultyRaw = String(body.difficulty ?? '').trim().toLowerCase();

    const difficulty: Difficulty =
      difficultyRaw === 'hard'
        ? 'hard'
        : difficultyRaw === 'medium'
          ? 'medium'
          : difficultyRaw === 'easy' || difficultyRaw === 'short'
            ? 'easy'
            : 'easy';

    if (!topic) return NextResponse.json({ error: 'Missing topic' }, { status: 400 });

    // UI uses "Easy"; keep the label natural in the prompt.
    const difficultyLabel = difficulty === 'easy' ? 'easy' : difficulty;

    const client = getGitHubModelsClient();
    const completion = await client.chat.completions.create({
      model: process.env.GITHUB_MODELS_MODEL ?? 'openai/gpt-4o',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content:
            'You generate multiple-choice quizzes. Return ONLY valid JSON. No markdown, no code fences. Each question must have exactly 4 choices and exactly one correct answer.',
        },
        {
          role: 'user',
          content:
            `Topic: ${topic}\nDifficulty: ${difficultyLabel}\n\nGenerate 10 multiple-choice questions. Return JSON as an array like:\n[\n  {\n    "question": "...",\n    "choices": ["A", "B", "C", "D"],\n    "answerIndex": 0\n  }\n]\n\nRules:\n- choices must be plausible\n- answerIndex must be 0-3\n- Keep questions concise\n- Difficulty should match the requested level`,
        },
      ],
      response_format: { type: 'json_object' } as any,
    });

    const raw = completion.choices?.[0]?.message?.content ?? '';

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Model returned invalid JSON', raw }, { status: 502 });
    }

    const questions = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.questions)
        ? parsed.questions
        : Array.isArray(parsed.quiz)
          ? parsed.quiz
          : null;

    if (!questions) {
      return NextResponse.json({ error: 'Unexpected JSON shape from model', raw }, { status: 502 });
    }

    const cleaned: QuizQ[] = questions.slice(0, 10).map((q: any) => {
      const question = String(q?.question ?? '').trim();
      const choices = Array.isArray(q?.choices) ? q.choices.map((c: any) => String(c).trim()) : [];
      const answerIndex = Number(q?.answerIndex);
      return { question, choices, answerIndex };
    });

    const valid = cleaned.filter((q: QuizQ) => {
      return (
        q.question &&
        Array.isArray(q.choices) &&
        q.choices.length === 4 &&
        q.choices.every((c: string) => c) &&
        Number.isInteger(q.answerIndex) &&
        q.answerIndex >= 0 &&
        q.answerIndex <= 3
      );
    });

    if (valid.length < 3) {
      return NextResponse.json({ error: 'Not enough valid questions generated', raw }, { status: 502 });
    }

    // Record recent tool usage (best-effort).
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('tool_activity').upsert(
          {
            user_id: user.id,
            tool: 'quiz',
            topic,
          },
          { onConflict: 'user_id,tool' }
        );
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ topic, difficulty: difficultyLabel, questions: valid });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/quiz] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
