import Image from "next/image";
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import { cookies } from 'next/headers';

type DailyFact = {
  day: string;
  topic: string;
  fact: string;
};

async function getDailyFact(): Promise<DailyFact | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/daily-fact`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return (await res.json()) as DailyFact;
  } catch {
    return null;
  }
}

async function getRecentActivity() {
  try {
    // Call the API with the *current request cookies* so Supabase auth is available.
    // Also, in a Server Component you won't necessarily see a browser Network request.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c: { name: string; value: string }) => `${c.name}=${encodeURIComponent(c.value)}`)
      .join('; ');

    const res = await fetch(`${baseUrl}/api/activity`, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });

    if (!res.ok) return [] as Array<{ kind: string; title: string; href: string }>;
    const data = (await res.json()) as { items?: Array<{ kind: string; title: string; href: string }> };
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [] as Array<{ kind: string; title: string; href: string }>;
  }
}

type RecentItem = {
  kind: 'Chat' | 'Flashcards' | 'Quiz';
  title: string;
  href: string;
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = Boolean(user);
  const daily = await getDailyFact();

  // Only fetch activity if logged in; prevents extra work and avoids any auth edge cases.
  const recent = isAuthed ? await getRecentActivity() : [];

  // Only show real activity. If none is available, show an empty state in the UI.
  const recentItems: RecentItem[] = (recent as RecentItem[]) ?? [];

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
            Daily facts, an AI tutor, and study tools — all in one place.
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
        </section>

        {/* 1) Recent Study Activity */}
        {isAuthed ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900">Recent Study Activity</div>
                <div className="mt-1 text-xs text-zinc-500">Pick up where you left off.</div>
              </div>
              <a href="/dashboard" className="text-xs font-medium text-indigo-700 hover:underline">
                View all
              </a>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {recentItems.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 sm:col-span-3">
                  No recent activity yet. Start a chat or try Flashcards/Quiz to see it here.
                </div>
              ) : (
                recentItems.map((item) => {
                  const badgeClass =
                    item.kind === 'Chat'
                      ? 'border-sky-200 bg-sky-50 text-sky-700'
                      : item.kind === 'Flashcards'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700';

                  return (
                    <a
                      key={`${item.kind}:${item.title}`}
                      href={item.href}
                      className="group rounded-2xl border border-zinc-200 bg-white p-4 hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium ${badgeClass}`}
                        >
                          {item.kind}
                        </span>
                        <span className="text-xs text-zinc-400 group-hover:text-zinc-500">Open →</span>
                      </div>
                      <div className="mt-3 text-sm font-semibold text-zinc-900">{item.title}</div>
                      <div className="mt-1 text-xs text-zinc-600">Resume this study session</div>
                    </a>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        {/* 2) Main tiles */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* 1) Daily Study Fact */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-amber-50" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">Daily Study Fact</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {daily ? `Topic: ${daily.topic}` : 'Generating…'}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
                  Today
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200/70 bg-white/70 p-4">
                <p className="text-sm leading-6 text-zinc-800">
                  <span className="mr-2 text-lg font-semibold text-indigo-700">“</span>
                  {daily?.fact ?? "Loading today's fact."}
                  <span className="ml-1 text-lg font-semibold text-indigo-700">”</span>
                </p>
              </div>

              <div className="mt-3 text-xs text-zinc-500">Refresh to see a new one.</div>
            </div>
          </div>

          {/* 2) Ask AI Tutor */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Ask AI Tutor</div>
            <div className="mt-2 text-sm text-zinc-600">
              Ask anything and get step-by-step help. Your chats are saved to your account.
            </div>
            <a
              href="/dashboard"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Open tutor
            </a>
          </div>

          {/* 3) Study Tools */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Study Tools</div>
            <div className="mt-2 grid gap-2">
              <a
                href="/tools/flashcards"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Flashcards
              </a>
              <a
                href="/tools/quiz"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Quiz
              </a>
              <a
                href="/tools/notes"
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
              >
                Notes
              </a>
            </div>
          </div>
        </section>

        <footer className="text-xs text-zinc-500">
          Configure <span className="font-mono">.env.local</span> for Supabase + GitHub Models.
        </footer>
      </div>
    </main>
  );
}
