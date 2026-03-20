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

    // Tool activity: actual schema is (id, user_id, tool_name, created_at)
    // No topic column exists, so we show a generic label.
    let toolRows: Array<{ tool_name: string; created_at: string }> = [];
    try {
      const { data, error } = await supabase
        .from('tool_activity')
        .select('tool_name,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) console.error('[api/activity] tool_activity query error:', error);
      toolRows = (data ?? []) as any;
    } catch (e) {
      console.error('[api/activity] tool_activity query exception:', e);
      toolRows = [];
    }

    const items: Array<{ kind: 'Chat' | 'Flashcards' | 'Quiz'; title: string; href: string }> = [];

    // IMPORTANT: link to the actual conversation.
    if (conv?.id) {
      items.push({
        kind: 'Chat',
        title: chatTitle || 'Chat',
        href: `/dashboard?conversationId=${encodeURIComponent(conv.id)}`,
      });
    }

    for (const row of toolRows) {
      const tool = String(row.tool_name ?? '').toLowerCase().trim();
      if (!tool) continue;

      if (tool === 'flashcards' || tool === 'flashcard') {
        items.push({ kind: 'Flashcards', title: 'Last used: Flashcards', href: '/tools/flashcards' });
      } else if (tool === 'quiz' || tool === 'quizzes') {
        items.push({ kind: 'Quiz', title: 'Last used: Quiz', href: '/tools/quiz' });
      }
    }

    // stable ordering
    const order = new Map([['Chat', 0], ['Flashcards', 1], ['Quiz', 2]] as const);
    items.sort((a, b) => (order.get(a.kind) ?? 99) - (order.get(b.kind) ?? 99));

    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[api/activity] error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
