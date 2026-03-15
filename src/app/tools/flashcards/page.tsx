'use client';

import { useMemo, useState } from 'react';

type Flashcard = { question: string; answer: string };

type ApiOk = { topic: string; cards: Flashcard[] };

type ApiErr = { error: string; raw?: string };

type CheckState = 'unanswered' | 'correct' | 'incorrect';

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, ' ')
    .trim();
}

export default function FlashcardsPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checks, setChecks] = useState<Record<number, CheckState>>({});

  const canGenerate = useMemo(() => topic.trim().length > 1 && !loading, [topic, loading]);

  async function generate() {
    const t = topic.trim();
    if (!t) return;

    setLoading(true);
    setError(null);
    setCards([]);
    setRevealed({});
    setAnswers({});
    setChecks({});

    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: t }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ApiOk & ApiErr>;

      if (!res.ok) {
        throw new Error(String(data.error ?? `Request failed (${res.status})`));
      }

      setCards(Array.isArray(data.cards) ? (data.cards as Flashcard[]) : []);
      if (!Array.isArray(data.cards) || !(data.cards as Flashcard[]).length) {
        throw new Error('No flashcards returned');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function checkAnswer(i: number) {
    const user = norm(answers[i] ?? '');
    if (!user) {
      setChecks((c) => ({ ...c, [i]: 'unanswered' }));
      return;
    }

    const expected = norm(cards[i]?.answer ?? '');

    // Basic cross-check (exact after normalization). Can be improved later.
    const ok = user === expected;
    setChecks((c) => ({ ...c, [i]: ok ? 'correct' : 'incorrect' }));

    // After checking, allow reveal.
    setRevealed((r) => ({ ...r, [i]: true }));
  }

  function statusBadge(state: CheckState) {
    if (state === 'correct') {
      return (
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
          Correct
        </span>
      );
    }
    if (state === 'incorrect') {
      return (
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
          Not quite
        </span>
      );
    }
    return null;
  }

  return (
    <main className="min-h-dvh bg-zinc-50">
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Flashcards</h1>
            <p className="mt-2 text-sm text-zinc-600">Enter a topic/title and generate 5 flashcards.</p>
          </div>
          <a href="/" className="text-sm font-medium text-zinc-700 hover:underline">
            Home
          </a>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="text-sm font-medium text-zinc-900">Flashcard topic</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (canGenerate) void generate();
                }
              }}
              placeholder='e.g. "Photosynthesis" or "JavaScript closures"'
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        </div>

        {cards.length ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {cards.map((c, i) => {
              const isOpen = Boolean(revealed[i]);
              const state = checks[i] ?? 'unanswered';

              return (
                <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium text-zinc-500">Card {i + 1}</div>
                      {statusBadge(state)}
                    </div>
                    <button
                      onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
                      className="text-xs font-medium text-indigo-700 hover:underline"
                    >
                      {isOpen ? 'Hide answer' : 'Reveal answer'}
                    </button>
                  </div>

                  <div className="mt-3 text-sm font-semibold text-zinc-900">{c.question}</div>

                  <div className="mt-4">
                    <label className="text-xs font-medium text-zinc-600">Your answer</label>
                    <textarea
                      value={answers[i] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAnswers((a) => ({ ...a, [i]: v }));
                        setChecks((cs) => ({ ...cs, [i]: 'unanswered' }));
                      }}
                      rows={2}
                      placeholder="Type your answer here…"
                      className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-200"
                    />

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => checkAnswer(i)}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        Check
                      </button>
                      <button
                        onClick={() => {
                          setAnswers((a) => ({ ...a, [i]: '' }));
                          setChecks((cs) => ({ ...cs, [i]: 'unanswered' }));
                          setRevealed((r) => ({ ...r, [i]: false }));
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                      >
                        Reset
                      </button>
                    </div>

                    {state === 'incorrect' ? (
                      <div className="mt-3 text-xs text-zinc-600">
                        Tip: try to be precise. (Right now this check is strict; we can make it more flexible.)
                      </div>
                    ) : null}
                  </div>

                  {isOpen ? (
                    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-zinc-800">
                      <div className="text-xs font-medium text-indigo-700">Official answer</div>
                      <div className="mt-1">{c.answer}</div>
                    </div>
                  ) : (
                    <div className="mt-4 text-xs text-zinc-500">Official answer hidden</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
