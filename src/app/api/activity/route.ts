import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      if (userErr.message?.toLowerCase?.().includes('auth session missing')) {
        return NextResponse.json({ items: [] });
      }
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }
    if (!user) return NextResponse.json({ items: [] });

    const { data: conv } = await supabase
      .from('conversations')
      .select('id,title,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let chatTitle = (conv?.title ?? '').trim();
    if (conv?.id && (!chatTitle || chatTitle.toLowerCase() === 'new chat')) {
      const { data: lastUserMsg } = await supabase
        .from('messages')
        .select('content,created_at')
        .eq('conversation_id', conv.id)
        .eq('user_id', user.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastUserMsg?.content) {
        const t = String(lastUserMsg.content).trim();
        chatTitle = t.length > 40 ? t.slice(0, 40) + '…' : t;
      }
    }

    type Kind = 'Chat' | 'Flashcards' | 'Quiz';
    type Item = { kind: Kind; title: string; href: string; ts: number };

    // Tool activity can be in one of two schemas depending on which SQL was applied:
    // A) (id, user_id, tool_name, created_at)
    // B) (user_id, tool, topic, created_at, updated_at)
    type ToolEvent = { tool: string; topic?: string; ts: number };

    const toolEvents: ToolEvent[] = [];

    // Try schema A first
    try {
      const { data, error } = await supabase
        .from('tool_activity')
        .select('tool_name,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (!error && Array.isArray(data) && data.length) {
        for (const row of data as any[]) {
          const tool = String(row?.tool_name ?? '').trim();
          if (!tool) continue;
          const ts = row?.created_at ? Date.parse(String(row.created_at)) : NaN;
          toolEvents.push({ tool, ts: Number.isFinite(ts) ? ts : 0 });
        }
      } else if (error) {
        // ignore and fall back to schema B
        console.error('[api/activity] tool_activity query (tool_name) error:', error);
      }
    } catch (e) {
      console.error('[api/activity] tool_activity query (tool_name) exception:', e);
    }

    // Fall back to schema B if we didn't find events above
    if (toolEvents.length === 0) {
      try {
        const { data, error } = await supabase
          .from('tool_activity')
          .select('tool,topic,updated_at,created_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (error) console.error('[api/activity] tool_activity query (tool/topic) error:', error);
        if (Array.isArray(data)) {
          for (const row of data as any[]) {
            const tool = String(row?.tool ?? '').trim();
            if (!tool) continue;
            const tsRaw = row?.updated_at ?? row?.created_at;
            const ts = tsRaw ? Date.parse(String(tsRaw)) : NaN;
            const topic = row?.topic ? String(row.topic).trim() : undefined;
            toolEvents.push({ tool, topic, ts: Number.isFinite(ts) ? ts : 0 });
          }
        }
      } catch (e) {
        console.error('[api/activity] tool_activity query (tool/topic) exception:', e);
      }
    }

    const merged: Item[] = [];

    // Chat
    if (conv?.id) {
      const ts = conv?.updated_at ? Date.parse(String(conv.updated_at)) : Date.now();
      merged.push({
        kind: 'Chat',
        title: chatTitle || 'Chat',
        href: `/dashboard?conversationId=${encodeURIComponent(conv.id)}`,
        ts: Number.isFinite(ts) ? ts : Date.now(),
      });
    }

    // Tools: keep latest per kind
    const latestToolByKind = new Map<Exclude<Kind, 'Chat'>, Item>();
    for (const ev of toolEvents) {
      const tool = String(ev.tool).toLowerCase().trim();
      const safeTs = Number.isFinite(ev.ts) ? ev.ts : 0;

      if (tool === 'flashcards' || tool === 'flashcard') {
        const existing = latestToolByKind.get('Flashcards');
        if (!existing || safeTs > existing.ts) {
          const topic = ev.topic ? `: ${ev.topic}` : '';
          latestToolByKind.set('Flashcards', {
            kind: 'Flashcards',
            title: `Last used: Flashcards${topic}`,
            href: '/tools/flashcards',
            ts: safeTs,
          });
        }
      } else if (tool === 'quiz' || tool === 'quizzes') {
        const existing = latestToolByKind.get('Quiz');
        if (!existing || safeTs > existing.ts) {
          const topic = ev.topic ? `: ${ev.topic}` : '';
          latestToolByKind.set('Quiz', {
            kind: 'Quiz',
            title: `Last used: Quiz${topic}`,
            href: '/tools/quiz',
            ts: safeTs,
          });
        }
      }
    }

    for (const it of latestToolByKind.values()) merged.push(it);

    merged.sort((a, b) => b.ts - a.ts);

    return NextResponse.json({
      items: merged.slice(0, 6).map(({ kind, title, href }) => ({ kind, title, href })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/activity] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
