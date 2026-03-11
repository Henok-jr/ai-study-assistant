import ChatShell from './ui/ChatShell';
import { logoutAction } from './actions';

export default function DashboardPage() {
  return (
    <main className="h-dvh bg-zinc-50">
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200 bg-white px-4 py-3">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Dashboard</div>
              <div className="text-xs text-zinc-500">Chat is available only when you’re logged in.</div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Log out
              </button>
            </form>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <ChatShell />
        </div>
      </div>
    </main>
  );
}
