# AI Study Assistant

Next.js (App Router) project for an AI-powered study assistant with:
- an authenticated, saved chat tutor
- study tools (flashcards, quizzes, notes)
- a daily study fact
- “Recent Study Activity” that lets users jump back into their latest chat/tool

## What it does
- **AI Tutor (Chat)**: streaming chat UI that persists conversations + messages to Supabase so users can resume later.
- **Flashcards**: generate flashcards from a topic and practice by revealing/checking answers.
- **Quiz**: generate a multiple-choice quiz (difficulty selectable) and score results.
- **Notes**: generate/keep study notes for a topic.
- **Daily Study Fact**: fetches a daily fact via an API route and displays it on the landing page.
- **Recent Study Activity**: shows the most recent chat and last-used tools (flashcards/quiz) for quick resume.

## Tech stack
- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth + Postgres)
- **GitHub Models / OpenAI-compatible SDK** (`openai` package) for AI generation (chat + tools)

## Project structure (high level)
- `src/app/`
  - `page.tsx`: landing page, daily fact, recent activity, links to tools
  - `dashboard/`: authenticated chat UI
  - `tools/`: Flashcards / Quiz / Notes pages
  - `api/`: server routes for chat + tools + activity + daily fact
  - `auth/callback/route.ts`: Supabase auth callback
- `src/lib/`
  - `supabaseServer.ts`: server-side Supabase client
  - `supabaseClient.ts`: browser Supabase client + shared types
  - `openaiClient.ts`: OpenAI/GitHub Models client helpers
- `components/`: UI components (chat input/messages, sidebar history)
- `supabase.sql`: database schema

## Key features & how they work

### Authentication & route protection
- Supabase authentication is used for login/signup.
- `src/middleware.ts` protects authenticated-only pages (e.g. `/dashboard`) and handles redirects.

### Chat (Dashboard)
- UI: `src/app/dashboard/ui/ChatShell.tsx`
- Persistence: conversations and messages are stored in Supabase.
- API: `POST /api/chat` streams assistant output.

### Study tools
- **Flashcards**
  - Page: `src/app/tools/flashcards/page.tsx`
  - API: `POST /api/flashcards`
- **Quiz**
  - Page: `src/app/tools/quiz/page.tsx`
  - API: `POST /api/quiz`
- **Notes**
  - Page: `src/app/tools/notes/page.tsx`
  - API: `POST /api/notes`

### Daily fact
- Landing page calls `GET /api/daily-fact` (no-store) to show the current day’s fact.

### Recent Study Activity
- Landing page calls `GET /api/activity` with the request cookies (so the server can read the Supabase session).
- The activity endpoint merges:
  - latest chat conversation
  - last-used tool entries (flashcards/quiz)

## Database schema (Supabase)
See `supabase.sql`.

Tables used:
- `conversations`: one row per chat thread
- `messages`: chat messages
- `daily_facts`: one fact per day
- `tool_activity`: records tool usage (either append-only events or “last-used per tool”, depending on which schema you applied)

## Environment variables
Create `.env.local` (copy from your template if present).

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GITHUB_TOKEN` (used by the OpenAI-compatible client against GitHub Models)

Optional:
- `GITHUB_MODELS_MODEL` (defaults to `openai/gpt-4o`)
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`) – used for server-side fetches

## App routes
- `/` landing (daily fact + recent activity + tool links)
- `/signup` create account
- `/login` log in
- `/dashboard` chat tutor (protected)
- `/tools/flashcards`
- `/tools/quiz`
- `/tools/notes`

## API routes
- `POST /api/chat` streaming tutor chat (auth required)
- `GET /api/activity` recent activity feed (auth required)
- `GET /api/daily-fact` daily fact
- `POST /api/flashcards` generate flashcards (auth required)
- `POST /api/quiz` generate quiz (auth required)
- `POST /api/notes` generate notes (auth required)

## Development
Run the dev server using your normal workflow (a VS Code task named `dev` is included).
