import Link from 'next/link';
import { signupAction } from './actions';

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const errorRaw = sp.error;
  const error = Array.isArray(errorRaw) ? errorRaw[0] : errorRaw;

  return (
    <main className="min-h-dvh bg-zinc-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Create account</h1>
          <p className="mt-1 text-sm text-zinc-600">Start chatting with your AI tutor.</p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error === 'missing' ? 'Email and password are required.' : decodeURIComponent(error)}
          </div>
        ) : null}

        <form action={signupAction} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-900">Email</span>
              <input
                name="email"
                type="email"
                required
                className="h-11 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-900">Password</span>
              <input
                name="password"
                type="password"
                required
                className="h-11 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
              />
            </label>

            <button
              type="submit"
              className="mt-2 h-11 rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Sign up
            </button>
          </div>
        </form>

        <div className="text-sm text-zinc-600">
          Already have an account?{' '}
          <Link className="font-medium text-zinc-900 underline" href="/login">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
