# AI Study Assistant

Next.js (App Router) SaaS starter for an AI Study Assistant.

## Tech stack
- Next.js + TypeScript + Tailwind
- Supabase Authentication
- OpenAI API (streaming)

## Setup
1. Create env file:
   - `cp .env.example .env.local`
2. Fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - Optional: `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)

## Routes
- `/` landing page
- `/signup` create account
- `/login` log in
- `/dashboard` protected chat UI
- `POST /api/chat` protected AI streaming route

## Auth / route protection
- `src/middleware.ts` protects `/dashboard` and also redirects logged-in users away from `/login` and `/signup`.
- The AI route (`/api/chat`) requires a valid Supabase session.

## Development
Run the dev server with your usual workflow (VS Code task `dev` is included).
