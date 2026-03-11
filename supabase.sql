-- Supabase schema for persisting chat history
-- Run this in the Supabase SQL editor.

-- Conversations table (one row per chat thread)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table (messages in a conversation)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_user_id_idx on public.messages(user_id);

-- Automatically keep conversations.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- RLS policies: users can only access their own rows

drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own" on public.conversations
for select
using (auth.uid() = user_id);

drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own" on public.conversations
for insert
with check (auth.uid() = user_id);

drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own" on public.conversations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own" on public.conversations
for delete
using (auth.uid() = user_id);

-- Messages policies

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages
for select
using (auth.uid() = user_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
for insert
with check (auth.uid() = user_id);

-- Optional: allow deleting own messages
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages
for delete
using (auth.uid() = user_id);
