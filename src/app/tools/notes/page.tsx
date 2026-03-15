'use client';

import { useMemo, useState } from 'react';

type ApiOk = { notes: string };

type ApiErr = { error: string };

export default function NotesPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  const canConvert = useMemo(() => text.trim().length > 10 && !loading, [text, loading]);

  async function convert() {
    const t = text.trim();
    if (!t) return;

    setLoading(true);
    setError(null);
    setNotes('');

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ApiOk & ApiErr>;

      if (!res.ok) {
        throw new Error(String(data.error ?? `Request failed (${res.status})`));
      }

      const out = String(data.notes ?? '').trim();
      if (!out) throw new Error('No notes returned');

      setNotes(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Notes</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Paste lecture notes or a topic. We&apos;ll convert it into structured study notes.
            </p>
          </div>
          <a href="/" className="text-sm font-medium text-zinc-700 hover:underline">
            Home
          </a>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <label className="text-sm font-medium text-zinc-900">Paste lecture notes or topic</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              placeholder="Example: Photosynthesis — definition, light-dependent reactions, Calvin cycle, key terms..."
              className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-200"
            />

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={convert}
                disabled={!canConvert}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? 'Converting…' : 'Convert to study notes'}
              </button>
              <button
                onClick={() => {
                  setText('');
                  setNotes('');
                  setError(null);
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Clear
              </button>
            </div>

            {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-zinc-900">Structured notes</div>
              {notes ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(notes);
                    } catch {
                      // ignore
                    }
                  }}
                  className="text-xs font-medium text-indigo-700 hover:underline"
                >
                  Copy
                </button>
              ) : null}
            </div>

            {notes ? (
              <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-900">
                {notes}
              </pre>
            ) : (
              <div className="mt-4 text-sm text-zinc-600">
                {loading ? 'Working…' : 'Your structured notes will appear here.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
