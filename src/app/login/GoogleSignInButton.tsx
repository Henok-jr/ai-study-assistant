'use client';

import { createSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function GoogleSignInButton() {
  async function onClick() {
    const supabase = createSupabaseBrowserClient();

    const redirectTo =
      process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL?.trim() || `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (error) {
      // Keep UI minimal for now
      alert(error.message);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 w-full rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-900 hover:bg-zinc-50"
    >
      Continue with Google
    </button>
  );
}
