'use client';

import { useMemo, useState } from 'react';

type Difficulty = 'Easy' | 'medium' | 'hard';

type QuizQuestion = {
  question: string;
  choices: string[];
  answerIndex: number;
};

type ApiOk = { topic: string; difficulty: Difficulty; questions: QuizQuestion[] };

type ApiErr = { error: string; raw?: string };

export default function QuizPage() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const [selected, setSelected] = useState<Record<number, number>>({});
  const [checkedByQ, setCheckedByQ] = useState<Record<number, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const canGenerate = useMemo(() => topic.trim().length > 1 && !loading, [topic, loading]);

  const finalScore = useMemo(() => {
    if (!questions.length) return null;

    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (selected[i] === questions[i]?.answerIndex) correct++;
    }

    return { correct, total: questions.length };
  }, [questions, selected]);

  const current = questions[idx];
  const picked = selected[idx];
  const checked = Boolean(checkedByQ[idx]);

  const isLast = idx === questions.length - 1;
  const isFirst = idx === 0;

  async function generate() {
    const t = topic.trim();
    if (!t) return;

    setLoading(true);
    setError(null);
    setQuestions([]);
    setSelected({});
    setCheckedByQ({});
    setIdx(0);
    setShowResults(false);

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: t, difficulty }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ApiOk & ApiErr>;

      if (!res.ok) {
        throw new Error(String(data.error ?? `Request failed (${res.status})`));
      }

      if (!Array.isArray(data.questions) || !data.questions.length) {
        throw new Error('No quiz questions returned');
      }

      setQuestions(data.questions as QuizQuestion[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function checkNow() {
    setCheckedByQ((c) => ({ ...c, [idx]: true }));
  }

  function resetAll() {
    setSelected({});
    setCheckedByQ({});
    setIdx(0);
    setShowResults(false);
  }

  return (
    <main className="min-h-dvh bg-zinc-50">
      <div className="mx-auto w-full max-w-4xl px-6 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Quiz</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Choose a topic and strength, then take a 10-question quiz (one question at a time).
            </p>
          </div>
          <a href="/" className="text-sm font-medium text-zinc-700 hover:underline">
            Home
          </a>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-zinc-900">Quiz topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (canGenerate) void generate();
                  }
                }}
                placeholder='e.g. "Cell biology" or "World War II"'
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-900">Strength</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="Easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Start quiz'}
            </button>
          </div>

          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        </div>

        {showResults && finalScore ? (
          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Your results</div>
            <div className="mt-2 text-sm text-zinc-700">
              Score: <span className="font-semibold text-zinc-900">{finalScore.correct}</span>/{finalScore.total}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={resetAll}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Retake
              </button>
              <a
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Ask AI Tutor
              </a>
            </div>
          </div>
        ) : null}

        {!showResults && questions.length && current ? (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-700">
                Question {idx + 1} / {questions.length}
              </div>
              {checked ? (
                <div className="text-sm font-medium text-zinc-800">
                  {picked === current.answerIndex ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                      Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
                      Incorrect
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">{current.question}</div>

              <div className="mt-4 grid gap-2">
                {current.choices.map((choice, cIdx) => {
                  const isSelected = picked === cIdx;
                  const isCorrect = cIdx === current.answerIndex;

                  const base = 'flex items-start gap-3 rounded-xl border px-3 py-2 text-sm transition-colors';

                  const classes = !checked
                    ? `${base} border-zinc-200 bg-white hover:bg-zinc-50`
                    : isCorrect
                      ? `${base} border-emerald-200 bg-emerald-50`
                      : isSelected
                        ? `${base} border-rose-200 bg-rose-50`
                        : `${base} border-zinc-200 bg-white`;

                  return (
                    <button
                      key={cIdx}
                      type="button"
                      disabled={checked}
                      onClick={() => {
                        setSelected((s) => ({ ...s, [idx]: cIdx }));
                      }}
                      className={classes}
                    >
                      <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border border-zinc-300 bg-white">
                        {isSelected ? <span className="h-2 w-2 rounded-full bg-zinc-900" /> : null}
                      </span>
                      <span className="text-left text-zinc-900">{choice}</span>
                    </button>
                  );
                })}
              </div>

              {checked ? (
                <div className="mt-4 text-xs text-zinc-600">
                  Correct answer:{' '}
                  <span className="font-medium text-zinc-900">{current.choices[current.answerIndex]}</span>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setIdx((v) => Math.max(0, v - 1))}
                    disabled={isFirst}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      if (isLast) {
                        setShowResults(true);
                        return;
                      }
                      setIdx((v) => Math.min(questions.length - 1, v + 1));
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900"
                  >
                    {isLast ? 'Finish' : 'Next'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={checkNow}
                    disabled={checked || typeof picked !== 'number'}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Check
                  </button>
                  <button
                    onClick={() => {
                      setSelected((s) => {
                        const next = { ...s };
                        delete next[idx];
                        return next;
                      });
                      setCheckedByQ((c) => ({ ...c, [idx]: false }));
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Retry
                  </button>
                  <button
                    onClick={resetAll}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                  >
                    Reset quiz
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
