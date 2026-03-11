import Image from "next/image";
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = Boolean(user);

  return (
    <main className="min-h-dvh bg-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-900">AI Study Assistant</div>
          <nav className="flex items-center gap-3">
            {isAuthed ? (
              <a
                href="/dashboard"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Go to dashboard
              </a>
            ) : (
              <>
                <a
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Log in
                </a>
                <a
                  href="/dashboard"
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Go to dashboard
                </a>
              </>
            )}
          </nav>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Study smarter with an AI tutor.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600">
            Ask questions, get step-by-step explanations, and keep your learning history in one place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isAuthed ? null : (
              <a
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Create account
              </a>
            )}
            <a
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Try the chat
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-sm font-semibold text-zinc-900">Chat</div>
              <div className="mt-1 text-sm text-zinc-600">Streaming answers with a clean interface.</div>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-sm font-semibold text-zinc-900">History</div>
              <div className="mt-1 text-sm text-zinc-600">Save and revisit previous conversations.</div>
            </div>
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-sm font-semibold text-zinc-900">Documents</div>
              <div className="mt-1 text-sm text-zinc-600">Upload PDFs/text and get summaries (next).</div>
            </div>
          </div>
        </section>

        <footer className="text-xs text-zinc-500">
          Configure <span className="font-mono">.env.local</span> for Supabase + OpenAI to enable auth and AI responses.
        </footer>
      </div>
    </main>
  );
}
