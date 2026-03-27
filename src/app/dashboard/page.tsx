import ChatShell from './ui/ChatShell';
import Link from 'next/link';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <main className="h-dvh bg-zinc-50">
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200 bg-white px-4 py-3">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Dashboard</div>
              <div className="text-xs text-zinc-500">Chat is available only when you’re logged in.</div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Home
              </Link>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Suspense fallback={<div className="p-6 text-sm text-zinc-600">Loading…</div>}>
            <ChatShell />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
