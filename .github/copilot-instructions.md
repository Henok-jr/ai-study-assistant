<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# AI Study Assistant (Next.js + Supabase + OpenAI)

- Use Next.js App Router with Server Components by default.
- Use Client Components only for interactive UI (chat input, streaming rendering).
- Keep secrets in `.env.local` (never commit).
- Prefer `@/` imports (paths are rooted at `src/`).
- For OpenAI, use streaming responses in `app/api/*` routes.
- For Supabase auth/data access:
  - Browser-side: use a browser client.
  - Server-side: use server client patterns and avoid leaking service role keys.
