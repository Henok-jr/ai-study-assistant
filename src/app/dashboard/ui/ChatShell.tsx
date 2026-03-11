'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import SidebarHistory from '@/components/SidebarHistory';
import {
  createSupabaseBrowserClient,
  type ConversationRow,
  type MessageRow,
} from '@/lib/supabaseClient';

type Msg = { role: 'user' | 'assistant'; content: string };

type Conversation = {
  id: string;
  messages: Msg[];
  createdAt: number;
  title: string;
  isPersisted: boolean;
};

export default function ChatShell() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from Supabase
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function load() {
      setIsLoading(true);

      const { data: convs, error: convErr } = await supabase
        .from('conversations')
        .select('id,user_id,title,created_at,updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (convErr) {
        console.error('[chat] load conversations error:', convErr);
        setIsLoading(false);
        // Keep at least one empty conversation
        const id = crypto.randomUUID();
        setConversations([
          { id, messages: [], createdAt: Date.now(), title: 'New chat', isPersisted: false },
        ]);
        setActiveId(id);
        return;
      }

      const rows = (convs ?? []) as ConversationRow[];

      if (rows.length === 0) {
        const id = crypto.randomUUID();
        setConversations([
          { id, messages: [], createdAt: Date.now(), title: 'New chat', isPersisted: false },
        ]);
        setActiveId(id);
        setIsLoading(false);
        return;
      }

      // Load messages for all conversations (simple approach; ok for MVP)
      const ids = rows.map((r) => r.id);
      const { data: msgs, error: msgErr } = await supabase
        .from('messages')
        .select('id,conversation_id,user_id,role,content,created_at')
        .in('conversation_id', ids)
        .order('created_at', { ascending: true });

      if (msgErr) {
        console.error('[chat] load messages error:', msgErr);
      }

      const msgRows = ((msgs ?? []) as MessageRow[]) ?? [];

      const byConv = new Map<string, Msg[]>();
      for (const m of msgRows) {
        const list = byConv.get(m.conversation_id) ?? [];
        list.push({ role: m.role, content: m.content });
        byConv.set(m.conversation_id, list);
      }

      const mapped: Conversation[] = rows.map((r) => ({
        id: r.id,
        messages: byConv.get(r.id) ?? [],
        createdAt: new Date(r.created_at).getTime(),
        title: r.title || 'New chat',
        isPersisted: true,
      }));

      setConversations(mapped);
      setActiveId(mapped[0]!.id);
      setIsLoading(false);
    }

    load();
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId),
    [conversations, activeId]
  );

  const historyItems = useMemo(
    () =>
      conversations
        .map((c) => ({ id: c.id, title: c.title || 'New chat' }))
        .slice(0, 50),
    [conversations]
  );

  function updateConversation(id: string, updater: (c: Conversation) => Conversation) {
    setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  async function ensurePersistedConversation(convId: string, firstMessage: string) {
    const supabase = createSupabaseBrowserClient();

    // If already persisted, nothing to do
    const conv = conversations.find((c) => c.id === convId);
    if (conv?.isPersisted) return;

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      throw new Error('Unauthorized');
    }

    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + '…' : firstMessage;

    const { data, error } = await supabase
      .from('conversations')
      .insert([{ id: convId, title, user_id: user.id }])
      .select('id')
      .single();

    if (error) throw error;
    if (!data?.id) throw new Error('Failed to create conversation');

    updateConversation(convId, (c) => ({ ...c, title, isPersisted: true }));
  }

  async function persistMessage(convId: string, role: 'user' | 'assistant', content: string) {
    const supabase = createSupabaseBrowserClient();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      throw new Error('Unauthorized');
    }

    const { error } = await supabase
      .from('messages')
      .insert([{ conversation_id: convId, role, content, user_id: user.id }]);
    if (error) throw error;

    // Touch updated_at
    await supabase.from('conversations').update({ title: undefined }).eq('id', convId);
  }

  async function send(message: string) {
    if (!activeId) return;

    setIsSending(true);
    const convId = activeId;

    // optimistic UI: user + placeholder assistant
    updateConversation(convId, (c) => ({
      ...c,
      title: c.title && c.title !== 'New chat' ? c.title : message,
      messages: [...c.messages, { role: 'user', content: message }, { role: 'assistant', content: '' }],
    }));

    try {
      await ensurePersistedConversation(convId, message);
      await persistMessage(convId, 'user', message);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId: convId }),
      });

      if (res.status === 401) {
        router.push('/login');
        throw new Error('Unauthorized. Please log in again.');
      }

      if (!res.ok || !res.body) {
        const contentType = res.headers.get('content-type') ?? '';
        let detail = '';

        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null);
          detail = json?.error ? String(json.error) : '';
        } else {
          detail = await res.text().catch(() => '');
        }

        throw new Error(detail || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;

        updateConversation(convId, (c) => {
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: (last.content ?? '') + chunk };
          }
          return { ...c, messages: msgs };
        });
      }

      if (assistantText.trim()) {
        await persistMessage(convId, 'assistant', assistantText);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : e && typeof e === 'object' && 'message' in e
              ? String((e as { message?: unknown }).message)
              : JSON.stringify(e);

      updateConversation(convId, (c) => {
        const msgs = [...c.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') {
          msgs[msgs.length - 1] = { role: 'assistant', content: `Error: ${msg || 'Unknown error'}` };
        }
        return { ...c, messages: msgs };
      });
    } finally {
      setIsSending(false);
    }
  }

  function startNewChat() {
    const id = crypto.randomUUID();
    const next: Conversation = {
      id,
      messages: [],
      createdAt: Date.now(),
      title: 'New chat',
      isPersisted: false,
    };
    setConversations((prev) => [next, ...prev].slice(0, 50));
    setActiveId(id);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = e.currentTarget as HTMLTextAreaElement;
      const prompt = target.value.trim();
      if (prompt) {
        send(prompt);
        target.value = '';
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      <SidebarHistory
        items={historyItems}
        onSelect={(id: string) => setActiveId(id)}
        onNewChat={startNewChat}
        activeId={activeId}
      />

      <section className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
          <Link href="/" className="inline-flex items-center">
            <div className="text-sm font-semibold text-zinc-900 hover:underline">
              AI Study Assistant
            </div>
          </Link>
          <div className="text-xs text-zinc-500">Ask questions, get step-by-step answers.</div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {isLoading ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
                Loading history...
              </div>
            ) : !activeConversation || activeConversation.messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
                Ask your first question to start a conversation.
              </div>
            ) : (
              activeConversation.messages.map((m, idx) => (
                <ChatMessage key={idx} role={m.role} content={m.content} />
              ))
            )}
          </div>
        </div>

        <footer className="shrink-0 border-t border-zinc-200 bg-white p-4">
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput onSend={send} disabled={isSending} submitOnEnter />
          </div>
        </footer>
      </section>
    </div>
  );
}
