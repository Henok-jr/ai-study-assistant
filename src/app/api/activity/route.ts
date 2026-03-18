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
      // If session is missing, don't 500; just return empty so the homepage can render.
      if (userErr.message?.toLowerCase?.().includes('auth session missing')) {
        return NextResponse.json({ items: [] });
      }
      return NextResponse.json({ error: userErr.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ items: [] });
    }

    const { data: conv } = await supabase
      .from('conversations')
      .select('id,title,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // If title is missing/default, fall back to latest user message preview.
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

    // Tool activity (preferred source)
    let tool: Array<{ tool: string; topic: string; updated_at: string }> = [];
    try {
      const { data, error } = await supabase
        .from('tool_activity')
        .select('tool,topic,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) console.error('[api/activity] tool_activity query error:', error);
      tool = (data ?? []) as any;
    } catch (e) {
      console.error('[api/activity] tool_activity query exception:', e);
      tool = [];
    }

    if (!tool.length) {
      console.warn('[api/activity] tool_activity returned 0 rows for user:', user.id);
    }

    const items: Array<{ kind: 'Chat' | 'Flashcards' | 'Quiz'; title: string; href: string }> = [];

    if (conv?.id) {
      items.push({ kind: 'Chat', title: chatTitle || 'Chat', href: '/dashboard' });
    }

    for (const row of tool ?? []) {
      if (row.tool === 'flashcards') {
        items.push({ kind: 'Flashcards', title: row.topic, href: '/tools/flashcards' });
      } else if (row.tool === 'quiz') {
        items.push({ kind: 'Quiz', title: row.topic, href: '/tools/quiz' });
      }
    }

    // Ensure stable ordering Chat -> Flashcards -> Quiz if possible
    const order = new Map([['Chat', 0], ['Flashcards', 1], ['Quiz', 2]] as const);
    items.sort((a, b) => (order.get(a.kind) ?? 99) - (order.get(b.kind) ?? 99));

    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/activity] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
