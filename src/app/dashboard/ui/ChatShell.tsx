'use client';

import { useMemo, useState } from 'react';
import ChatInput from '@/components/ChatInput';
import ChatMessage from '@/components/ChatMessage';
import SidebarHistory from '@/components/SidebarHistory';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function ChatShell() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isSending, setIsSending] = useState(false);

  const historyItems = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user')
        .slice(-20)
        .map((m, idx) => ({
          id: String(idx),
          title: m.content.length > 40 ? m.content.slice(0, 40) + '…' : m.content,
        })),
    [messages]
  );

  async function send(message: string) {
    setIsSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
          }
          return copy;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === 'assistant') {
          copy[copy.length - 1] = { role: 'assistant', content: `Error: ${msg}` };
        }
        return copy;
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-dvh">
      <SidebarHistory items={historyItems} />

      <section className="flex flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white px-4 py-3">
          <div className="text-sm font-semibold text-zinc-900">AI Study Assistant</div>
          <div className="text-xs text-zinc-500">Ask questions, get step-by-step answers.</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600">
                Ask your first question to start a conversation.
              </div>
            ) : (
              messages.map((m, idx) => <ChatMessage key={idx} role={m.role} content={m.content} />)
            )}
          </div>
        </div>

        <footer className="border-t border-zinc-200 bg-white p-4">
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput onSend={send} disabled={isSending} />
          </div>
        </footer>
      </section>
    </div>
  );
}
